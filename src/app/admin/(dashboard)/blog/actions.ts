"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { publishTime } from "@/lib/blog-time";
import { MISSING_FACT_MARK } from "@/lib/blog-approve";
import { announceDuePosts } from "@/lib/blog-publish";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optStr = (f: FormData, k: string) => str(f, k) || null;

/** Bỏ script, sự kiện on*, style/class dán từ Word/Google Docs — giữ thẻ định dạng cơ bản */
function cleanHtml(html: string) {
  // Giữ khối JSON-LD (FAQ/HowTo do công cụ blog-auto chèn) — không chạy được, chỉ để Google/AI đọc
  const ld: string[] = [];
  const kept = html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, (m) => {
    ld.push(m.replace(/^<script\b[^>]*>/i, '<script type="application/ld+json">'));
    return `\u0000LD${ld.length - 1}\u0000`;
  });
  return kept
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|meta|link)\b[^>]*>/gi, "")
    .replace(/\s(on\w+|style|id|data-[\w-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // class chỉ giữ "tldr" (hộp Trả lời nhanh), bỏ class dán từ Word/Google Docs
    .replace(/\sclass\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, (m, v: string) => (/^["']?tldr["']?$/.test(v) ? ' class="tldr"' : ""))
    .replace(/href\s*=\s*(["'])\s*javascript:[^"']*\1/gi, 'href="#"')
    .replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "")
    .replace(/\u0000LD(\d+)\u0000/g, (_, i: string) => ld[Number(i)])
    .trim();
}

function refresh(id?: string, path?: string) {
  revalidatePath("/admin/blog");
  if (id) revalidatePath(`/admin/blog/${id}`);
  revalidatePath("/blog");
  if (path) revalidatePath(path);
  revalidatePath("/");
}

export async function createPost(form: FormData) {
  await assertAdmin();
  const title = str(form, "title");
  if (!title) return;
  const kind = str(form, "kind") === "page" ? "page" : "post";
  const { data, error } = await createAdminSupabase()
    .from("posts")
    .insert({ title, kind, slug: slugify(title), is_published: false })
    .select("id")
    .single();
  if (error) throw new Error(error.code === "23505" ? "Đã có bài trùng đường dẫn" : error.message);
  refresh();
  redirect(`/admin/blog/${data.id}`);
}

export async function updatePost(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  const kind = str(form, "kind") === "page" ? "page" : "post";
  const slug = slugify(str(form, "slug") || str(form, "title"));
  const { error } = await createAdminSupabase()
    .from("posts")
    .update({
      kind,
      slug,
      title: str(form, "title"),
      excerpt: optStr(form, "excerpt"),
      cover_url: optStr(form, "cover_url"),
      category: optStr(form, "category"),
      content_html: cleanHtml(String(form.get("content_html") ?? "")),
      is_published: form.get("is_published") === "on",
      published_at: publishTime(str(form, "published_at"), str(form, "published_at_orig")),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.code === "23505" ? "Đường dẫn đã trùng bài khác" : error.message);
  refresh(id, kind === "page" ? `/p/${slug}` : `/blog/${slug}`);
}

export async function deletePost(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("posts").delete().eq("id", str(form, "id"));
  refresh();
  redirect("/admin/blog");
}

/**
 * Nút "Duyệt đăng" ngay ở danh sách bài nháp.
 * Ô giờ để trống: bài đã có giờ hẹn (lịch tuần của blog-auto) thì giữ giờ hẹn, không thì đăng ngay.
 */
export async function approveFromList(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  const db = createAdminSupabase();
  const { data: post } = await db.from("posts").select("id, kind, slug, content_html, published_at").eq("id", id).single();
  if (!post) throw new Error("Không thấy bài");
  // Bài còn chỗ AI đánh dấu thiếu số liệu thật -> không cho đăng, mở bài ra sửa
  if ((post.content_html ?? "").includes(MISSING_FACT_MARK)) redirect(`/admin/blog?loi=thieu-so&bai=${id}`);

  const now = new Date();
  const chosen = str(form, "when");
  const when = chosen
    ? publishTime(chosen, post.published_at)
    : post.published_at && new Date(post.published_at) > now
      ? post.published_at
      : now.toISOString();
  const { error } = await db.from("posts").update({ is_published: true, published_at: when, updated_at: now.toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh(id, post.kind === "page" ? `/p/${post.slug}` : `/blog/${post.slug}`);
  // Đăng ngay -> báo IndexNow + Telegram luôn (bài hẹn giờ thì cron 5 phút lo khi tới giờ)
  if (new Date(when) <= now) await announceDuePosts().catch((e) => console.error("announce", e));
}

/** Đổi giờ hẹn / gỡ bài về nháp ngay ở danh sách */
export async function reschedulePost(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  const db = createAdminSupabase();
  const { data: post } = await db.from("posts").select("id, kind, slug, published_at").eq("id", id).single();
  if (!post) throw new Error("Không thấy bài");
  const patch =
    form.get("unpublish") === "1"
      ? { is_published: false }
      : { published_at: publishTime(str(form, "when"), post.published_at) };
  const { error } = await db.from("posts").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh(id, post.kind === "page" ? `/p/${post.slug}` : `/blog/${post.slug}`);
}
