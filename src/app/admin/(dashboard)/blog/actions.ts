"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optStr = (f: FormData, k: string) => str(f, k) || null;

/** Bỏ script, sự kiện on*, style/class dán từ Word/Google Docs — giữ thẻ định dạng cơ bản */
function cleanHtml(html: string) {
  return html
    .replace(/<(script|style|meta|link)\b[\s\S]*?(<\/\1>|\/?>)/gi, "")
    .replace(/\s(on\w+|style|class|id|data-[\w-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/href\s*=\s*(["'])\s*javascript:[^"']*\1/gi, 'href="#"')
    .replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "")
    .trim();
}

/** ISO -> "yyyy-mm-dd" theo giờ Việt Nam */
const vnDate = (d: Date) => new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

/**
 * Ô ngày chỉ có ngày, không có giờ:
 *  - không đổi ngày  -> giữ nguyên giờ đăng cũ
 *  - chọn hôm nay    -> đăng ngay bây giờ (nếu gán 8h sáng thì trước 8h bài bị ẩn như hẹn giờ)
 *  - ngày khác       -> 8h sáng ngày đó (ngày tương lai = hẹn giờ đăng)
 */
function publishTime(date: string, original: string) {
  const now = new Date();
  if (!date) return now.toISOString();
  if (original && date === vnDate(new Date(original))) return original;
  if (date === vnDate(now)) return now.toISOString();
  return new Date(`${date}T08:00:00+07:00`).toISOString();
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
