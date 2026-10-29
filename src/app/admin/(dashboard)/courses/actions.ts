"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optStr = (f: FormData, k: string) => str(f, k) || null;
const int = (f: FormData, k: string) => {
  const n = parseInt(str(f, k).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

/** "12:34" | "1:02:03" | "754" -> giây */
function parseDuration(s: string) {
  if (!s) return 0;
  const parts = s.split(":").map((p) => parseInt(p, 10) || 0);
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

/** Nhận cả link (youtu.be/…, youtube.com/watch?v=…, /shorts/…, /embed/…) lẫn ID trơn */
function youtubeId(s: string) {
  if (!s) return null;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/(?:embed|shorts|live)\/)([\w-]{11})/);
  return m ? m[1] : s;
}

function refresh(courseId?: string) {
  revalidatePath("/admin/courses");
  if (courseId) revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/", "layout");
}

export async function createCourse(form: FormData) {
  await assertAdmin();
  const title = str(form, "title");
  if (!title) return;
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("courses")
    .insert({ title, slug: slugify(str(form, "slug") || title), price_vnd: int(form, "price") ?? 0, is_published: false })
    .select("id")
    .single();
  if (error) throw new Error(error.code === "23505" ? "Đường dẫn (slug) đã tồn tại" : error.message);
  refresh();
  redirect(`/admin/courses/${data.id}`);
}

export async function updateCourse(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  const outcomes = str(form, "outcomes").split("\n").map((s) => s.trim()).filter(Boolean);
  const { error } = await createAdminSupabase()
    .from("courses")
    .update({
      title: str(form, "title"),
      slug: slugify(str(form, "slug")),
      subtitle: optStr(form, "subtitle"),
      description: optStr(form, "description"),
      cover_url: optStr(form, "cover_url"),
      price_vnd: int(form, "price") ?? 0,
      compare_price_vnd: int(form, "compare_price"),
      access_days: int(form, "access_days"),
      gr_campaign_id: optStr(form, "gr_campaign_id"),
      position: int(form, "position") ?? 0,
      is_published: form.get("is_published") === "on",
      outcomes,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  refresh(id);
}

export async function deleteCourse(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("courses").delete().eq("id", str(form, "id"));
  refresh();
  redirect("/admin/courses");
}

export async function addChapter(form: FormData) {
  await assertAdmin();
  const courseId = str(form, "course_id");
  const db = createAdminSupabase();
  const { count } = await db.from("chapters").select("id", { count: "exact", head: true }).eq("course_id", courseId);
  await db.from("chapters").insert({ course_id: courseId, title: str(form, "title") || "Chương mới", position: (count ?? 0) + 1 });
  refresh(courseId);
}

export async function updateChapter(form: FormData) {
  await assertAdmin();
  await createAdminSupabase()
    .from("chapters")
    .update({ title: str(form, "title"), position: int(form, "position") ?? 0 })
    .eq("id", str(form, "id"));
  refresh(str(form, "course_id"));
}

export async function deleteChapter(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("chapters").delete().eq("id", str(form, "id"));
  refresh(str(form, "course_id"));
}

export async function addLesson(form: FormData) {
  await assertAdmin();
  const courseId = str(form, "course_id");
  const chapterId = str(form, "chapter_id");
  const db = createAdminSupabase();
  const { count } = await db.from("lessons").select("id", { count: "exact", head: true }).eq("chapter_id", chapterId);
  await db.from("lessons").insert({
    course_id: courseId,
    chapter_id: chapterId,
    title: str(form, "title") || "Bài mới",
    position: (count ?? 0) + 1,
  });
  refresh(courseId);
}

export async function updateLesson(form: FormData) {
  await assertAdmin();
  const courseId = str(form, "course_id");
  const lessonId = str(form, "id");
  const db = createAdminSupabase();
  await db
    .from("lessons")
    .update({
      title: str(form, "title"),
      position: int(form, "position") ?? 0,
      bunny_video_id: optStr(form, "bunny_video_id"),
      youtube_id: youtubeId(str(form, "youtube_id")),
      duration_seconds: parseDuration(str(form, "duration")),
      is_free_preview: form.get("is_free_preview") === "on",
      content: optStr(form, "content"),
    })
    .eq("id", lessonId);

  // Tài liệu: mỗi dòng "Tên tài liệu | https://link"
  const resources = str(form, "resources")
    .split("\n")
    .map((line) => line.split("|").map((s) => s.trim()))
    .filter(([label, href]) => label && href)
    .map(([label, href], i) => ({ lesson_id: lessonId, label, href, position: i }));
  await db.from("lesson_resources").delete().eq("lesson_id", lessonId);
  if (resources.length) await db.from("lesson_resources").insert(resources);

  refresh(courseId);
}

export async function deleteLesson(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("lessons").delete().eq("id", str(form, "id"));
  refresh(str(form, "course_id"));
}
