import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * GỬI ZALO cho khách (chăm sóc đăng ký chưa thanh toán). 2 đường, ưu tiên theo thứ tự:
 *  1. ZNS của Zalo OA — chính thức, gửi theo SĐT không cần kết bạn. Cần: ZALO_APP_ID + ZALO_APP_SECRET trên Netlify,
 *     refresh token OA dán ở Admin → Kênh Zalo, và bước automation có "mã mẫu ZNS" đã được Zalo duyệt.
 *  2. Hàng chờ zalo_outbox — tiện ích Chrome "Zalo CSKH" trên máy anh lấy về, gửi bằng Zalo cá nhân (chat.zalo.me).
 * ZNS lỗi (hết hạn mức, SĐT không dùng Zalo, mẫu chưa duyệt…) thì tự rơi xuống đường 2.
 */

/** 0xxxxxxxxx (VN) hoặc null */
export function normPhone(v: unknown): string | null {
  let s = String(v ?? "").replace(/[^\d+]/g, "");
  if (s.startsWith("+84")) s = "0" + s.slice(3);
  else if (s.startsWith("84") && s.length === 11) s = "0" + s.slice(2);
  else if (/^[1-9]\d{8}$/.test(s)) s = "0" + s;
  return /^0\d{9}$/.test(s) ? s : null;
}
const to84 = (p: string) => "84" + p.slice(1);

/** HTML soạn trong khung email -> chữ thường cho tin Zalo */
export function htmlToText(html: string) {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_, href: string, label: string) => (label.replace(/<[^>]+>/g, "").trim() === href ? href : `${label} ${href}`))
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/(p|div|li|h\d)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------- ZNS (Zalo OA) ----------------

export const isZnsConfigured = () => !!(process.env.ZALO_APP_ID && process.env.ZALO_APP_SECRET);

/** Access token OA còn hạn; tự đổi bằng refresh token (refresh token chỉ dùng 1 lần -> lưu cái mới) */
export async function znsAccessToken(): Promise<string | null> {
  if (!isZnsConfigured()) return null;
  const db = createAdminSupabase();
  const { data: row } = await db.from("zalo_oa_tokens").select("*").eq("id", 1).maybeSingle();
  if (!row?.refresh_token) return null;
  if (row.access_token && row.expires_at && new Date(row.expires_at).getTime() - Date.now() > 10 * 60_000) return row.access_token;
  const res = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", secret_key: process.env.ZALO_APP_SECRET! },
    body: new URLSearchParams({ refresh_token: row.refresh_token, app_id: process.env.ZALO_APP_ID!, grant_type: "refresh_token" }),
  });
  const j = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: string | number; error?: number; error_description?: string };
  if (!j.access_token || !j.refresh_token) {
    console.error("Zalo OA refresh token lỗi", j.error, j.error_description);
    return null;
  }
  await db
    .from("zalo_oa_tokens")
    .update({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: new Date(Date.now() + Number(j.expires_in ?? 90000) * 1000).toISOString(), updated_at: new Date().toISOString() })
    .eq("id", 1);
  return j.access_token;
}

/** Tên tham số của mẫu ZNS (đọc từ Zalo, nhớ trong 1 giờ) */
const paramCache = new Map<string, { at: number; names: string[] }>();
async function templateParams(token: string, templateId: string) {
  const hit = paramCache.get(templateId);
  if (hit && Date.now() - hit.at < 3600_000) return hit.names;
  const res = await fetch(`https://business.openapi.zalo.me/template/info/v2?template_id=${encodeURIComponent(templateId)}`, { headers: { access_token: token } });
  const j = (await res.json().catch(() => ({}))) as { error?: number; message?: string; data?: { listParams?: { name: string }[] } };
  if (j.error) throw new Error(`Mẫu ZNS ${templateId}: ${j.message ?? j.error}`);
  const names = (j.data?.listParams ?? []).map((p) => p.name);
  paramCache.set(templateId, { at: Date.now(), names });
  return names;
}

/** Tên tham số hay đặt trong mẫu ZNS -> biến automation */
const PARAM_ALIAS: Record<string, string> = {
  customer_name: "ten", name: "ten", ten_khach: "ten", ho_ten: "ten",
  course_name: "khoa_hoc", product_name: "khoa_hoc", ten_khoa: "khoa_hoc",
  order_code: "ma_don", order_id: "ma_don", ma_don_hang: "ma_don",
  price: "so_tien", amount: "so_tien", total: "so_tien",
  payment_link: "link_don_hang", link: "link_don_hang",
};

export async function sendZns(input: { phone: string; templateId: string; vars: Record<string, string>; trackingId: string }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const token = await znsAccessToken();
    if (!token) return { ok: false, error: "Chưa cấu hình Zalo OA" };
    const names = await templateParams(token, input.templateId);
    const template_data: Record<string, string> = {};
    for (const n of names) {
      const v = input.vars[n] ?? input.vars[PARAM_ALIAS[n] ?? ""] ?? "";
      template_data[n] = v.slice(0, 200) || "-";
    }
    const res = await fetch("https://business.openapi.zalo.me/message/template", {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: token },
      body: JSON.stringify({ phone: to84(input.phone), template_id: input.templateId, template_data, tracking_id: input.trackingId.slice(0, 48) }),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: number; message?: string; data?: { msg_id?: string } };
    if (j.error) return { ok: false, error: `ZNS ${j.error}: ${j.message ?? ""}` };
    return { ok: true, id: j.data?.msg_id ?? "" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------- Hàng chờ Zalo cá nhân ----------------

export async function queueZalo(input: { phone: string; name?: string | null; text: string; runId?: string | null; messageId?: string | null }) {
  const { error } = await createAdminSupabase().from("zalo_outbox").insert({
    phone: input.phone, name: input.name ?? null, text: input.text, run_id: input.runId ?? null, message_id: input.messageId ?? null,
  });
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

/** Tiện ích Chrome lấy tin cần gửi: đánh dấu 'sending'. Tin bị giữ quá 30 phút (máy tắt giữa chừng) được trả lại hàng chờ. */
export async function claimZalo(limit = 1) {
  const db = createAdminSupabase();
  const stale = new Date(Date.now() - 30 * 60_000).toISOString();
  await db.from("zalo_outbox").update({ status: "pending" }).eq("status", "sending").lt("claimed_at", stale).lt("attempts", 3);
  await db.from("zalo_outbox").update({ status: "failed", error: "Quá 3 lần không gửi được" }).eq("status", "sending").lt("claimed_at", stale).gte("attempts", 3);
  const { data } = await db.from("zalo_outbox").select("id, phone, name, text, attempts").eq("status", "pending").order("created_at").limit(Math.min(10, Math.max(1, limit)));
  const out = [];
  for (const m of data ?? []) {
    // Giữ chỗ có điều kiện để 2 máy chạy cùng lúc không gửi trùng
    const { data: got } = await db
      .from("zalo_outbox")
      .update({ status: "sending", claimed_at: new Date().toISOString(), attempts: m.attempts + 1 })
      .eq("id", m.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (got) out.push({ id: m.id, phone: m.phone, name: m.name, text: m.text });
  }
  return out;
}

/** Tiện ích báo kết quả. not_found = SĐT không có Zalo / chặn người lạ -> không thử lại. */
export async function reportZalo(id: string, result: { status: "sent" | "failed" | "not_found" | "retry"; error?: string }) {
  const db = createAdminSupabase();
  const { data: row } = await db.from("zalo_outbox").select("id, message_id, status").eq("id", id).maybeSingle();
  if (!row) return false;
  const now = new Date().toISOString();
  if (result.status === "retry") {
    await db.from("zalo_outbox").update({ status: "pending", error: result.error ?? null }).eq("id", id);
    return true;
  }
  const sent = result.status === "sent";
  const error = sent ? null : result.status === "not_found" ? result.error || "SĐT chưa dùng Zalo hoặc chặn tin người lạ" : result.error || "Gửi lỗi";
  await db.from("zalo_outbox").update({ status: sent ? "sent" : "failed", error, sent_at: sent ? now : null }).eq("id", id);
  if (row.message_id) {
    await db.from("automation_messages").update(sent ? { status: "sent", sent_at: now, error: null } : { status: "failed", error }).eq("id", row.message_id);
  }
  return true;
}
