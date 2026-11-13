"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isValidApproveToken, MISSING_FACT_MARK } from "@/lib/blog-approve";

/** Anh Tùng bấm "Duyệt & đăng" trên trang /duyet-bai/<id>?t=<chữ ký> */
export async function approvePost(form: FormData) {
  const id = String(form.get("id") ?? "");
  const t = String(form.get("t") ?? "");
  if (!isValidApproveToken(id, t)) throw new Error("Link duyệt không hợp lệ");

  const db = createAdminSupabase();
  const { data: post } = await db.from("posts").select("id, slug, content_html, is_published").eq("id", id).single();
  if (!post) throw new Error("Không thấy bài");
  if (post.content_html.includes(MISSING_FACT_MARK)) redirect(`/duyet-bai/${id}?t=${t}&loi=thieu-so`);

  if (!post.is_published) {
    const now = new Date().toISOString();
    const { error } = await db.from("posts").update({ is_published: true, published_at: now, updated_at: now }).eq("id", id);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/");
  revalidatePath("/admin/blog");
  redirect(`/duyet-bai/${id}?t=${t}&ok=1`);
}
