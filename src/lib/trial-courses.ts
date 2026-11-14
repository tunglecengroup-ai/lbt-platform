import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Khóa HỌC THỬ trên trang chủ (courses.trial_featured): bài mở miễn phí + bài khóa + video bài thử đầu tiên */
export type TrialCourse = {
  slug: string;
  title: string;
  subtitle: string | null;
  price: number;
  comparePrice: number | null;
  videoId: string | null;
  /** Bài học thử đầu tiên (đăng ký xong mở thẳng bài này) */
  firstFreeId: string | null;
  free: { title: string }[];
  locked: { title: string }[];
  total: number;
  totalSec: number;
  /** Mục lục theo chương (cho phần "Khóa học dạy gì") */
  chapters: { title: string; lessons: { title: string; sec: number; free: boolean }[] }[];
};

export async function listTrialCourses(): Promise<TrialCourse[]> {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const db = createAdminSupabase();
  const { data: courses } = await db
    .from("courses")
    .select("id, slug, title, subtitle, price_vnd, compare_price_vnd")
    .eq("is_published", true)
    .eq("trial_featured", true)
    .order("trial_position");
  if (!courses?.length) return [];
  const ids = courses.map((c) => c.id);
  const [{ data: chapters }, { data: lessons }] = await Promise.all([
    db.from("chapters").select("id, course_id, position, title").in("course_id", ids),
    db.from("lessons").select("id, course_id, chapter_id, position, title, is_free_preview, youtube_id, duration_seconds").in("course_id", ids),
  ]);
  const chPos = new Map((chapters ?? []).map((c) => [c.id, c.position as number]));
  return courses.map((c) => {
    const ls = (lessons ?? [])
      .filter((l) => l.course_id === c.id)
      .sort((a, b) => (chPos.get(a.chapter_id) ?? 0) - (chPos.get(b.chapter_id) ?? 0) || a.position - b.position);
    const free = ls.filter((l) => l.is_free_preview);
    return {
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle,
      price: c.price_vnd,
      comparePrice: c.compare_price_vnd,
      firstFreeId: free[0]?.id ?? null,
      videoId: free.find((l) => l.youtube_id)?.youtube_id ?? null,
      free: free.map((l) => ({ title: l.title })),
      locked: ls.filter((l) => !l.is_free_preview).map((l) => ({ title: l.title })),
      total: ls.length,
      totalSec: ls.reduce((t, l) => t + (l.duration_seconds ?? 0), 0),
      chapters: (chapters ?? [])
        .filter((ch) => ch.course_id === c.id)
        .sort((a, b) => a.position - b.position)
        .map((ch) => ({
          title: ch.title,
          lessons: ls.filter((l) => l.chapter_id === ch.id).map((l) => ({ title: l.title, sec: l.duration_seconds ?? 0, free: l.is_free_preview })),
        }))
        .filter((ch) => ch.lessons.length),
    };
  });
}
