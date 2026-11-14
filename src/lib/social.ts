import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";
import { slugify } from "@/lib/utils";
import { notifyTelegram } from "@/lib/email";

/**
 * ĐĂNG BÀI ĐA KÊNH — soạn 1 lần trong Admin, duyệt, rồi web tự đăng / hẹn giờ.
 *  • Facebook (fanpage): hẹn giờ bằng lịch gốc của Facebook; link pke.to đăng ở BÌNH LUẬN ĐẦU khi bài lên (cron 5 phút)
 *  • Instagram (ảnh), Threads, Telegram (kênh), Email (GetResponse): cron đăng đúng giờ
 *  • TikTok, YouTube, Zalo, Messenger: không có API đăng hợp lệ -> "Đăng tay" (chữ + ảnh + link theo dõi soạn sẵn)
 * Bí mật (token) chỉ đặt trong Netlify, không có trong code.
 */

export type SocialChannel = "facebook" | "instagram" | "threads" | "telegram" | "email" | "tiktok" | "youtube" | "zalo" | "messenger";
export type Media = { url: string; type: "image" | "video" };
export type SocialPost = {
  id: string; title: string; body: string; link_path: string | null; fb_comment_link: string | null;
  media: Media[]; channels: SocialChannel[]; scheduled_at: string | null; status: string;
  check_warnings: string[]; approved_at: string | null; created_at: string; updated_at: string;
};
export type Delivery = {
  id: string; post_id: string; channel: SocialChannel; status: string; run_at: string; external_id: string | null;
  external_url: string | null; comment_status: string | null; error: string | null; attempts: number; done_at: string | null;
};

const GRAPH = "https://graph.facebook.com/v23.0";

export const SOCIAL: Record<SocialChannel, { label: string; auto: boolean; source: string; medium: string; ready: () => boolean; setup: string }> = {
  facebook: { label: "Fanpage Facebook", auto: true, source: "facebook", medium: "social", ready: () => !!(process.env.FB_PAGE_ID && process.env.FB_PAGE_TOKEN), setup: "FB_PAGE_ID + FB_PAGE_TOKEN (token trang, quyền pages_manage_posts)" },
  instagram: { label: "Instagram", auto: true, source: "instagram", medium: "social", ready: () => !!(process.env.IG_USER_ID && process.env.FB_PAGE_TOKEN), setup: "Liên kết Instagram với fanpage rồi thêm IG_USER_ID (dùng chung FB_PAGE_TOKEN)" },
  threads: { label: "Threads", auto: true, source: "threads", medium: "social", ready: () => !!(process.env.THREADS_USER_ID && process.env.THREADS_TOKEN), setup: "THREADS_USER_ID + THREADS_TOKEN (Threads API)" },
  telegram: { label: "Telegram (kênh)", auto: true, source: "telegram", medium: "chat", ready: () => !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID), setup: "TELEGRAM_CHANNEL_ID (@ten_kenh, bot là admin kênh) + TELEGRAM_BOT_TOKEN" },
  email: { label: "Email (GetResponse)", auto: true, source: "email", medium: "email", ready: () => !!(process.env.GETRESPONSE_API_KEY && process.env.GETRESPONSE_NEWSLETTER_CAMPAIGN_ID && process.env.GETRESPONSE_FROM_FIELD_ID), setup: "GETRESPONSE_API_KEY + GETRESPONSE_NEWSLETTER_CAMPAIGN_ID (list) + GETRESPONSE_FROM_FIELD_ID" },
  tiktok: { label: "TikTok", auto: false, source: "tiktok", medium: "social", ready: () => true, setup: "TikTok chỉ cho app đã kiểm duyệt đăng công khai → đăng tay" },
  youtube: { label: "YouTube", auto: false, source: "youtube", medium: "video", ready: () => true, setup: "Đăng video bằng YouTube Studio → đăng tay" },
  zalo: { label: "Zalo", auto: false, source: "zalo", medium: "chat", ready: () => true, setup: "Zalo cá nhân/nhóm không có API → đăng tay" },
  messenger: { label: "Messenger", auto: false, source: "messenger", medium: "chat", ready: () => true, setup: "Meta cấm gửi tin hàng loạt → đăng tay cho từng người" },
};
export const SOCIAL_ORDER: SocialChannel[] = ["facebook", "instagram", "threads", "telegram", "email", "tiktok", "youtube", "zalo", "messenger"];

/** Link trang đích có mã theo dõi riêng cho từng kênh (nguồn khách hiện ở Admin → Nguồn khách) */
export function trackedLink(post: Pick<SocialPost, "id" | "title" | "link_path">, channel: SocialChannel) {
  if (!post.link_path) return null;
  const u = new URL(post.link_path, siteUrl);
  const c = SOCIAL[channel];
  u.searchParams.set("utm_source", c.source);
  u.searchParams.set("utm_medium", c.medium);
  u.searchParams.set("utm_campaign", slugify(post.title).slice(0, 60) || "bai-dang");
  u.searchParams.set("utm_content", `bai-${post.id.slice(0, 8)}`);
  return u.toString();
}

/** Chữ đăng cho từng kênh */
export function textFor(post: SocialPost, channel: SocialChannel) {
  const link = trackedLink(post, channel);
  if (channel === "facebook") return post.body; // link ở bình luận đầu
  if (channel === "instagram") return `${post.body}\n\nLink ở bio trang cá nhân.`;
  return link ? `${post.body}\n\n${link}` : post.body;
}

// ---------------- KẾT NỐI TỪNG KÊNH ----------------

async function graph(path: string, params: Record<string, string>, base = GRAPH) {
  const res = await fetch(`${base}/${path}`, { method: "POST", body: new URLSearchParams(params) });
  const json = (await res.json().catch(() => ({}))) as { id?: string; post_id?: string; error?: { message?: string } };
  if (!res.ok || json.error) throw new Error(json.error?.message || `HTTP ${res.status}`);
  return json;
}

/** Facebook: đăng / hẹn giờ bằng lịch gốc của Facebook (cần cách hiện tại ≥ 10 phút) */
async function publishFacebook(post: SocialPost, when: Date) {
  const page = process.env.FB_PAGE_ID!;
  const token = process.env.FB_PAGE_TOKEN!;
  const schedule = when.getTime() > Date.now() + 11 * 60_000;
  const timing: Record<string, string> = schedule ? { published: "false", scheduled_publish_time: String(Math.floor(when.getTime() / 1000)) } : {};
  const video = post.media.find((m) => m.type === "video");
  if (video) {
    const r = await graph(`${page}/videos`, { file_url: video.url, description: post.body, access_token: token, ...timing });
    return { id: r.id!, url: `https://www.facebook.com/${r.id}`, scheduled: schedule };
  }
  const images = post.media.filter((m) => m.type === "image");
  const attached: string[] = [];
  for (const img of images.slice(0, 10)) {
    const r = await graph(`${page}/photos`, { url: img.url, published: "false", temporary: schedule ? "true" : "false", access_token: token });
    attached.push(JSON.stringify({ media_fbid: r.id }));
  }
  const params: Record<string, string> = { message: post.body, access_token: token, ...timing };
  attached.forEach((a, i) => (params[`attached_media[${i}]`] = a));
  const r = await graph(`${page}/feed`, params);
  return { id: r.id!, url: `https://www.facebook.com/${r.id}`, scheduled: schedule };
}

async function commentFacebook(postId: string, link: string) {
  await graph(`${postId}/comments`, { message: `Chi tiết anh/chị xem tại đây: ${link}`, access_token: process.env.FB_PAGE_TOKEN! });
}

/** Instagram: 1 ảnh (ảnh đầu tiên). Video/Reels -> đăng tay. */
async function publishInstagram(post: SocialPost) {
  const ig = process.env.IG_USER_ID!;
  const token = process.env.FB_PAGE_TOKEN!;
  const img = post.media.find((m) => m.type === "image");
  if (!img) throw new Error("Instagram cần ít nhất 1 ảnh");
  const c = await graph(`${ig}/media`, { image_url: img.url, caption: textFor(post, "instagram").slice(0, 2200), access_token: token });
  const r = await graph(`${ig}/media_publish`, { creation_id: c.id!, access_token: token });
  return { id: r.id!, url: null };
}

async function publishThreads(post: SocialPost) {
  const uid = process.env.THREADS_USER_ID!;
  const token = process.env.THREADS_TOKEN!;
  const base = "https://graph.threads.net/v1.0";
  const img = post.media.find((m) => m.type === "image");
  const text = textFor(post, "threads").slice(0, 500);
  const c = await graph(`${uid}/threads`, { media_type: img ? "IMAGE" : "TEXT", text, ...(img ? { image_url: img.url } : {}), access_token: token }, base);
  if (img) await new Promise((r) => setTimeout(r, 5000)); // Threads cần vài giây xử lý ảnh
  const r = await graph(`${uid}/threads_publish`, { creation_id: c.id!, access_token: token }, base);
  return { id: r.id!, url: null };
}

async function publishTelegram(post: SocialPost) {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const chat = process.env.TELEGRAM_CHANNEL_ID!;
  const text = textFor(post, "telegram");
  const img = post.media.find((m) => m.type === "image");
  const method = img && text.length <= 1024 ? "sendPhoto" : "sendMessage";
  const body = method === "sendPhoto" ? { chat_id: chat, photo: img!.url, caption: text } : { chat_id: chat, text, disable_web_page_preview: false };
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json()) as { ok: boolean; description?: string; result?: { message_id: number } };
  if (!json.ok) throw new Error(json.description || `HTTP ${res.status}`);
  const handle = chat.startsWith("@") ? chat.slice(1) : null;
  return { id: String(json.result?.message_id), url: handle ? `https://t.me/${handle}/${json.result?.message_id}` : null };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Email gửi cả danh sách qua GetResponse (newsletter, gửi ngay) */
async function publishEmail(post: SocialPost) {
  const link = trackedLink(post, "email");
  const img = post.media.find((m) => m.type === "image");
  const html =
    `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;font-size:15px;line-height:1.6;color:#1f2937">` +
    (img ? `<p><img src="${img.url}" alt="" style="max-width:100%;border-radius:8px"></p>` : "") +
    post.body.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("") +
    (link ? `<p><a href="${link}" style="color:#2563eb;font-weight:bold">Xem chi tiết</a></p>` : "") +
    `<p>Lê Bá Tùng</p></div>`;
  const res = await fetch("https://api.getresponse.com/v3/newsletters", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Auth-Token": `api-key ${process.env.GETRESPONSE_API_KEY}` },
    body: JSON.stringify({
      name: post.title.slice(0, 120),
      subject: post.title.slice(0, 150),
      campaign: { campaignId: process.env.GETRESPONSE_NEWSLETTER_CAMPAIGN_ID },
      fromField: { fromFieldId: process.env.GETRESPONSE_FROM_FIELD_ID },
      content: { html, plain: textFor(post, "email") },
      sendSettings: { selectedCampaigns: [process.env.GETRESPONSE_NEWSLETTER_CAMPAIGN_ID], selectedSegments: [], selectedSuppressions: [], excludedCampaigns: [], excludedSegments: [], timeTravel: "false", perfectTiming: "false" },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { newsletterId?: string; message?: string };
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return { id: json.newsletterId ?? null, url: null };
}

// ---------------- BỘ MÁY ĐĂNG ----------------

const VN = 7 * 3_600_000;
const vnDay = (d: Date) => new Date(d.getTime() + VN).toISOString().slice(0, 10);

/** Luật fanpage: ≤ 3 bài/ngày, cách nhau ≥ 2 giờ (đếm bài đăng từ web + đọc lịch fanpage nếu token cho phép) */
export async function facebookSlotProblem(when: Date, excludePostId?: string): Promise<string | null> {
  const db = createAdminSupabase();
  const day = vnDay(when);
  const from = new Date(`${day}T00:00:00+07:00`).toISOString();
  const to = new Date(`${day}T23:59:59+07:00`).toISOString();
  const { data } = await db.from("social_deliveries").select("post_id, run_at, status").eq("channel", "facebook").in("status", ["pending", "scheduled", "sent"]).gte("run_at", from).lte("run_at", to);
  const times = (data ?? []).filter((d) => d.post_id !== excludePostId).map((d) => new Date(d.run_at).getTime());
  // Bài hẹn từ công cụ khác (fb-scheduler, phòng Brand) — đọc lịch fanpage nếu được
  if (process.env.FB_PAGE_ID && process.env.FB_PAGE_TOKEN) {
    try {
      const res = await fetch(`${GRAPH}/${process.env.FB_PAGE_ID}/scheduled_posts?fields=scheduled_publish_time&limit=100&access_token=${process.env.FB_PAGE_TOKEN}`);
      const j = (await res.json()) as { data?: { scheduled_publish_time: number }[] };
      for (const p of j.data ?? []) {
        const t = p.scheduled_publish_time * 1000;
        if (vnDay(new Date(t)) === day && !times.some((x) => Math.abs(x - t) < 60_000)) times.push(t);
      }
    } catch {}
  }
  if (times.length >= 3) return `Ngày ${day.split("-").reverse().join("/")} fanpage đã có ${times.length} bài — luật chống spam tối đa 3 bài/ngày.`;
  const near = times.find((t) => Math.abs(t - when.getTime()) < 2 * 3_600_000);
  if (near) return `Cách bài khác chưa đủ 2 giờ (bài kia lúc ${new Date(near + VN).toISOString().slice(11, 16)}).`;
  return null;
}

/** Duyệt: tạo lượt đăng cho từng kênh; Facebook hẹn giờ ngay bằng lịch gốc của Facebook */
export async function scheduleDeliveries(post: SocialPost) {
  const db = createAdminSupabase();
  const when = post.scheduled_at ? new Date(post.scheduled_at) : new Date();
  const rows = post.channels.map((ch) => ({
    post_id: post.id,
    channel: ch,
    status: SOCIAL[ch].auto ? "pending" : "manual",
    run_at: when.toISOString(),
    error: SOCIAL[ch].auto && !SOCIAL[ch].ready() ? `Chưa kết nối: ${SOCIAL[ch].setup}` : null,
  }));
  await db.from("social_deliveries").upsert(rows, { onConflict: "post_id,channel" });
  if (post.channels.includes("facebook") && SOCIAL.facebook.ready()) {
    await runDelivery(post, "facebook", when);
  }
}

async function runDelivery(post: SocialPost, ch: SocialChannel, when: Date) {
  const db = createAdminSupabase();
  const set = (patch: Record<string, unknown>) => db.from("social_deliveries").update(patch).eq("post_id", post.id).eq("channel", ch);
  if (!SOCIAL[ch].ready()) {
    await set({ status: "failed", error: `Chưa kết nối: ${SOCIAL[ch].setup}` });
    return false;
  }
  try {
    let r: { id: string | null; url: string | null; scheduled?: boolean };
    if (ch === "facebook") r = await publishFacebook(post, when);
    else if (ch === "instagram") r = await publishInstagram(post);
    else if (ch === "threads") r = await publishThreads(post);
    else if (ch === "telegram") r = await publishTelegram(post);
    else r = await publishEmail(post);
    await set({
      status: r.scheduled ? "scheduled" : "sent",
      external_id: r.id,
      external_url: r.url,
      error: null,
      done_at: r.scheduled ? null : new Date().toISOString(),
      ...(ch === "facebook" && post.fb_comment_link ? { comment_status: "pending" } : {}),
    });
    return true;
  } catch (e) {
    const { data } = await db.from("social_deliveries").select("attempts").eq("post_id", post.id).eq("channel", ch).single();
    const attempts = (data?.attempts ?? 0) + 1;
    await set({ status: attempts >= 3 ? "failed" : "pending", attempts, error: (e as Error).message.slice(0, 300), run_at: new Date(Date.now() + 10 * 60_000).toISOString() });
    return false;
  }
}

async function refreshPostStatus(postId: string) {
  const db = createAdminSupabase();
  const { data } = await db.from("social_deliveries").select("status").eq("post_id", postId);
  const st = (data ?? []).map((d) => d.status);
  if (!st.length || st.some((s) => s === "pending" || s === "scheduled")) return;
  const ok = st.filter((s) => s === "sent" || s === "manual").length;
  await db.from("social_posts").update({ status: ok === st.length ? "done" : ok ? "partial" : "failed", updated_at: new Date().toISOString() }).eq("id", postId);
}

/** Cron 5 phút: đăng các kênh tới giờ + bình luận link đầu cho bài fanpage vừa lên */
export async function runSocial() {
  const db = createAdminSupabase();
  const now = new Date();
  const report = { sent: 0, failed: 0, comments: 0 };

  const { data: due } = await db
    .from("social_deliveries")
    .select("id, post_id, channel, run_at")
    .eq("status", "pending")
    .lte("run_at", now.toISOString())
    .order("run_at")
    .limit(10);
  const postIds = [...new Set([...(due ?? []).map((d) => d.post_id)])];

  // Facebook: bài hẹn đã tới giờ -> coi như đã đăng, chờ bình luận
  const { data: fbDue } = await db
    .from("social_deliveries")
    .select("id, post_id, external_id, comment_status, run_at, status")
    .eq("channel", "facebook")
    .in("status", ["scheduled", "sent"])
    .lte("run_at", new Date(now.getTime() - 60_000).toISOString())
    .or("comment_status.eq.pending,status.eq.scheduled")
    .limit(10);
  postIds.push(...(fbDue ?? []).map((d) => d.post_id));

  const { data: posts } = postIds.length ? await db.from("social_posts").select("*").in("id", [...new Set(postIds)]) : { data: [] };
  const byId = new Map(((posts ?? []) as SocialPost[]).map((p) => [p.id, p]));

  for (const d of due ?? []) {
    const post = byId.get(d.post_id);
    if (!post || post.status === "cancelled") continue;
    const ok = await runDelivery(post, d.channel as SocialChannel, new Date(d.run_at));
    if (ok) report.sent++;
    else report.failed++;
    await refreshPostStatus(post.id);
  }

  for (const d of fbDue ?? []) {
    const post = byId.get(d.post_id);
    if (!post) continue;
    const patch: Record<string, unknown> = {};
    if (d.status === "scheduled") Object.assign(patch, { status: "sent", done_at: new Date().toISOString() });
    if (d.comment_status === "pending" && post.fb_comment_link && d.external_id) {
      try {
        await commentFacebook(d.external_id, post.fb_comment_link);
        patch.comment_status = "sent";
        report.comments++;
      } catch (e) {
        patch.comment_status = "failed";
        patch.error = `Bình luận link lỗi: ${(e as Error).message.slice(0, 200)}`;
      }
    }
    if (Object.keys(patch).length) await db.from("social_deliveries").update(patch).eq("id", d.id);
    await refreshPostStatus(post.id);
  }

  if (report.sent || report.failed) {
    await notifyTelegram(`📣 Đăng bài đa kênh: ${report.sent} kênh đã đăng${report.failed ? `, ${report.failed} lỗi (xem Admin → Đăng bài)` : ""}.`).catch(() => {});
  }
  return report;
}

/** Hủy bài đã duyệt: xóa bài hẹn trên Facebook (nếu chưa lên), dừng các kênh chưa đăng */
export async function cancelPost(postId: string) {
  const db = createAdminSupabase();
  const { data: fb } = await db.from("social_deliveries").select("external_id, status").eq("post_id", postId).eq("channel", "facebook").maybeSingle();
  if (fb?.status === "scheduled" && fb.external_id && process.env.FB_PAGE_TOKEN) {
    await fetch(`${GRAPH}/${fb.external_id}?access_token=${process.env.FB_PAGE_TOKEN}`, { method: "DELETE" }).catch(() => {});
  }
  await db.from("social_deliveries").update({ status: "cancelled" }).eq("post_id", postId).in("status", ["pending", "scheduled"]);
  await db.from("social_posts").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", postId);
}
