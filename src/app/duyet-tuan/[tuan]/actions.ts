"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isValidWeekToken, MISSING_FACT_MARK, weekRange } from "@/lib/blog-approve";

function refresh() {
  revalidatePath("/blog");
  revalidatePath("/");
  revalidatePath("/admin/blog");
}

/** Duyệt 1 hoặc tất cả bài nháp đã hẹn giờ trong tuần — bài giữ nguyên giờ hẹn, đến giờ tự hiện */
export async function approveWeek(form: FormData) {
  const tuan = String(form.get("tuan") ?? "");
  const t = String(form.get("t") ?? "");
  const only = String(form.get("id") ?? "");
  if (!isValidWeekToken(tuan, t)) throw new Error("Link duyệt không hợp lệ");
  const { start, end } = weekRange(tuan);

  const db = createAdminSupabase();
  let q = db.from("posts").select("id, content_html").eq("kind", "post").eq("is_published", false).gte("published_at", start).lt("published_at", end);
  if (only) q = q.eq("id", only);
  const { data } = await q;
  const ok = (data ?? []).filter((p) => !p.content_html.includes(MISSING_FACT_MARK)).map((p) => p.id);
  if (ok.length) {
    const { error } = await db.from("posts").update({ is_published: true, updated_at: new Date().toISOString() }).in("id", ok);
    if (error) throw new Error(error.message);
  }
  refresh();
  redirect(`/duyet-tuan/${tuan}?t=${t}&da=${ok.length}`);
}

/** Bỏ duyệt (đưa về nháp) 1 bài chưa tới giờ đăng */
export async function unapprovePost(form: FormData) {
  const tuan = String(form.get("tuan") ?? "");
  const t = String(form.get("t") ?? "");
  const id = String(form.get("id") ?? "");
  if (!isValidWeekToken(tuan, t)) throw new Error("Link duyệt không hợp lệ");
  const { start, end } = weekRange(tuan);
  const now = new Date().toISOString();
  await createAdminSupabase()
    .from("posts")
    .update({ is_published: false, updated_at: now })
    .eq("id", id)
    .gte("published_at", start < now ? now : start)
    .lt("published_at", end);
  refresh();
  redirect(`/duyet-tuan/${tuan}?t=${t}`);
}
