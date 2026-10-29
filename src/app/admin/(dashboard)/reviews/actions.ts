"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function refresh() {
  revalidatePath("/admin/reviews");
  revalidatePath("/", "layout");
}

export async function createReview(form: FormData) {
  await assertAdmin();
  const name = str(form, "name");
  const content = str(form, "content");
  if (!name || !content) return;
  const rating = Math.min(5, Math.max(1, parseInt(str(form, "rating"), 10) || 5));
  const { error } = await createAdminSupabase().from("reviews").insert({
    name,
    content,
    rating,
    role: str(form, "role") || null,
    course_id: str(form, "course_id") || null,
    is_featured: form.get("is_featured") === "on",
    position: parseInt(str(form, "position"), 10) || 0,
  });
  if (error) throw new Error(error.message);
  refresh();
}

export async function toggleFeatured(form: FormData) {
  await assertAdmin();
  await createAdminSupabase()
    .from("reviews")
    .update({ is_featured: str(form, "featured") !== "true" })
    .eq("id", str(form, "id"));
  refresh();
}

export async function deleteReview(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("reviews").delete().eq("id", str(form, "id"));
  refresh();
}
