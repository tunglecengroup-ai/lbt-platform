"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { publishTime } from "@/lib/blog-time";
import { checkContent, checkFacebook } from "@/lib/social-rules";
import { SOCIAL_ORDER, cancelPost, facebookSlotProblem, runSocial, scheduleDeliveries, type Media, type SocialChannel, type SocialPost } from "@/lib/social";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function refresh(id?: string) {
  revalidatePath("/admin/dang-bai");
  if (id) revalidatePath(`/admin/dang-bai/${id}`);
}

async function getPost(id: string) {
  const { data } = await createAdminSupabase().from("social_posts").select("*").eq("id", id).single();
  if (!data) throw new Error("Không thấy bài");
  return data as SocialPost;
}

export async function createSocialPost(form: FormData) {
  await assertAdmin();
  const title = str(form, "title");
  if (!title) return;
  const { data, error } = await createAdminSupabase().from("social_posts").insert({ title, channels: ["facebook", "telegram"] }).select("id").single();
  if (error) throw new Error(error.message);
  refresh();
  redirect(`/admin/dang-bai/${data.id}`);
}

/** Lưu nháp (mọi chỉnh sửa) — bài đã duyệt thì phải hủy trước mới sửa */
export async function saveSocialPost(form: FormData) {
  await assertAdmin();
  const post = await getPost(str(form, "id"));
  if (post.status !== "draft") throw new Error("Bài đã duyệt — bấm Hủy đăng rồi mới sửa");
  const media: Media[] = [
    ...post.media.filter((m) => !form.getAll("remove_media").includes(m.url)),
    ...str(form, "media_urls").split(/\s+/).filter((u) => /^https?:\/\//.test(u)).map((url) => ({ url, type: /\.(mp4|mov|webm)(\?|$)/i.test(url) ? "video" : "image" }) as Media),
  ];
  const channels = form.getAll("channels").map(String).filter((c): c is SocialChannel => (SOCIAL_ORDER as string[]).includes(c));
  const when = str(form, "scheduled_at");
  const { error } = await createAdminSupabase().from("social_posts").update({
    title: str(form, "title") || post.title,
    body: String(form.get("body") ?? "").replace(/\r\n/g, "\n").trim(),
    link_path: str(form, "link_path") || null,
    fb_comment_link: str(form, "fb_comment_link") || null,
    media,
    channels,
    scheduled_at: when ? publishTime(when, post.scheduled_at) : null,
    updated_at: new Date().toISOString(),
  }).eq("id", post.id);
  if (error) throw new Error(error.message);
  refresh(post.id);
}

/** Tải ảnh lên kho công khai (Supabase Storage) và gắn vào bài */
export async function uploadSocialMedia(form: FormData) {
  await assertAdmin();
  const post = await getPost(str(form, "id"));
  const db = createAdminSupabase();
  const added: Media[] = [];
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.reduce((s, f) => s + f.size, 0) > 4_500_000) throw new Error("Tổng ảnh mỗi lần tải quá 4,5MB — tải từng ảnh, nén nhỏ lại, hoặc dán link ảnh");
  for (const f of files) {
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${post.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await db.storage.from("social-media").upload(path, f, { contentType: f.type || "image/jpeg", upsert: false });
    if (error) throw new Error(error.message);
    const { data } = db.storage.from("social-media").getPublicUrl(path);
    added.push({ url: data.publicUrl, type: f.type.startsWith("video/") ? "video" : "image" });
  }
  if (added.length) await db.from("social_posts").update({ media: [...post.media, ...added], updated_at: new Date().toISOString() }).eq("id", post.id);
  refresh(post.id);
}

export type ApproveState = { errors?: string[]; ok?: boolean };

/** Kiểm tra + duyệt: lỗi nội dung (6 điều cấm, luật fanpage) thì chặn, không thì lên lịch từng kênh */
export async function approveSocialPost(_prev: ApproveState, form: FormData): Promise<ApproveState> {
  await assertAdmin();
  const post = await getPost(str(form, "id"));
  if (post.status !== "draft") return { errors: ["Bài đã duyệt rồi"] };
  const errors: string[] = [];
  if (!post.body.trim()) errors.push("Chưa có nội dung");
  if (!post.channels.length) errors.push("Chưa chọn kênh nào");
  for (const h of checkContent(`${post.title}\n${post.body}`)) errors.push(`Điều cấm ${h.rule} (${h.label}): «${h.text}»`);
  const when = post.scheduled_at ? new Date(post.scheduled_at) : new Date();
  if (post.channels.includes("facebook")) {
    errors.push(...checkFacebook(post.body, post.fb_comment_link));
    const slot = await facebookSlotProblem(when, post.id);
    if (slot) errors.push(`Fanpage: ${slot}`);
    if (post.scheduled_at && when.getTime() < Date.now() + 11 * 60_000 && when.getTime() > Date.now()) errors.push("Facebook chỉ hẹn được giờ cách hiện tại ít nhất 10 phút (hoặc để trống = đăng ngay).");
  }
  if (post.channels.includes("instagram") && !post.media.some((m) => m.type === "image")) errors.push("Instagram cần ít nhất 1 ảnh.");
  if (errors.length) return { errors };

  const db = createAdminSupabase();
  await db.from("social_posts").update({ status: "approved", approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", post.id);
  await scheduleDeliveries({ ...post, status: "approved" });
  if (!post.scheduled_at || when <= new Date()) await runSocial(); // đăng ngay các kênh còn lại
  refresh(post.id);
  return { ok: true };
}

export async function cancelSocialPost(form: FormData) {
  await assertAdmin();
  await cancelPost(str(form, "id"));
  refresh(str(form, "id"));
}

/** Đưa bài đã hủy về nháp để sửa và duyệt lại */
export async function reopenSocialPost(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  const db = createAdminSupabase();
  await db.from("social_deliveries").delete().eq("post_id", id).in("status", ["cancelled", "failed", "pending"]);
  await db.from("social_posts").update({ status: "draft", approved_at: null, updated_at: new Date().toISOString() }).eq("id", id);
  refresh(id);
}

/** Kênh đăng tay: anh bấm "Đã đăng" sau khi đăng xong */
export async function markManualDone(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  await createAdminSupabase().from("social_deliveries").update({ status: "sent", done_at: new Date().toISOString(), external_url: str(form, "url") || null }).eq("post_id", id).eq("channel", str(form, "channel"));
  refresh(id);
}

export async function retryDelivery(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  await createAdminSupabase().from("social_deliveries").update({ status: "pending", attempts: 0, run_at: new Date().toISOString(), error: null }).eq("post_id", id).eq("channel", str(form, "channel"));
  await runSocial();
  refresh(id);
}

export async function deleteSocialPost(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  const post = await getPost(id);
  if (post.status !== "draft" && post.status !== "cancelled") throw new Error("Hủy đăng trước rồi mới xóa");
  await createAdminSupabase().from("social_posts").delete().eq("id", id);
  refresh();
  redirect("/admin/dang-bai");
}
