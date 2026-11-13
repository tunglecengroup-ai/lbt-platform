import "server-only";
import { createPublicSupabase } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  LESSON_PUBLIC_COLUMNS,
  type ChapterWithLessons,
  type CourseOutline,
  type CourseRow,
  type LessonRow,
} from "@/lib/types";

/** Danh sách khóa đã publish cho trang chủ */
export async function listPublishedCourses(): Promise<(CourseRow & { lessonCount: number; totalSec: number })[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = createPublicSupabase();
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .eq("is_published", true)
    .order("position");
  if (error) throw error;

  const { data: lessons } = await supabase
    .from("lessons")
    .select("course_id, duration_seconds");

  return (courses ?? []).map((c) => {
    const ls = (lessons ?? []).filter((l) => l.course_id === c.id);
    return {
      ...(c as CourseRow),
      lessonCount: ls.length,
      totalSec: ls.reduce((s, l) => s + (l.duration_seconds ?? 0), 0),
    };
  });
}

/** Ghép chương + bài theo đúng thứ tự */
export function buildOutline(
  course: CourseRow,
  chapters: { id: string; title: string; position: number }[],
  lessons: LessonRow[],
): CourseOutline {
  const sortedChapters: ChapterWithLessons[] = [...chapters]
    .sort((a, b) => a.position - b.position)
    .map((ch) => ({
      ...ch,
      lessons: lessons
        .filter((l) => l.chapter_id === ch.id)
        .sort((a, b) => a.position - b.position),
    }));
  return { ...course, chapters: sortedChapters };
}

/** Khóa đã publish kèm mục lục (không có ID video) */
export async function getPublishedOutline(slug: string): Promise<CourseOutline | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = createPublicSupabase();
  // 3 truy vấn chạy CÙNG LÚC (lọc chương/bài theo slug khóa qua join) — trước đây phải chờ đọc khóa xong mới đọc chương/bài
  const [{ data: course }, { data: chapters }, { data: lessons }] = await Promise.all([
    supabase.from("courses").select("*").eq("slug", slug).eq("is_published", true).maybeSingle(),
    supabase.from("chapters").select("id, title, position, courses!inner(slug)").eq("courses.slug", slug),
    supabase.from("lessons").select(`${LESSON_PUBLIC_COLUMNS}, courses!inner(slug)`).eq("courses.slug", slug),
  ]);
  if (!course) return null;
  return buildOutline(
    course as CourseRow,
    (chapters ?? []).map(({ id, title, position }) => ({ id, title, position })),
    ((lessons ?? []) as unknown as (LessonRow & { courses?: unknown })[]).map((l) => {
      const row = { ...l };
      delete row.courses;
      return row as LessonRow;
    }),
  );
}

export function outlineStats(outline: CourseOutline) {
  const lessons = outline.chapters.flatMap((c) => c.lessons);
  return {
    lessons,
    total: lessons.length,
    totalSec: lessons.reduce((s, l) => s + l.duration_seconds, 0),
  };
}
