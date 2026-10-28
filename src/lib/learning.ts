import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { buildOutline } from "@/lib/courses";
import { lessonEmbedUrl } from "@/lib/video";
import { LESSON_PUBLIC_COLUMNS, type CourseOutline, type CourseRow, type LessonRow } from "@/lib/types";

/**
 * Dữ liệu KHU HỌC VIÊN — chạy dưới danh nghĩa học viên đang đăng nhập (RLS),
 * riêng ID video lấy bằng service role SAU KHI can_watch_lesson cho phép.
 */

export type StudentCourse = CourseOutline & {
  enrolled: boolean;
  completed: Set<string>;
  total: number;
  done: number;
  totalSec: number;
  progress: number;
};

export const getStudent = cache(async () => {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/hoc/dang-nhap");
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", data.user.id)
    .maybeSingle();
  const email = data.user.email ?? "";
  return {
    id: data.user.id,
    email,
    name: profile?.full_name || email.split("@")[0],
  };
});

function withStats(outline: CourseOutline, completed: Set<string>, enrolled: boolean): StudentCourse {
  const lessons = outline.chapters.flatMap((c) => c.lessons);
  const done = lessons.filter((l) => completed.has(l.id)).length;
  return {
    ...outline,
    enrolled,
    completed,
    total: lessons.length,
    done,
    totalSec: lessons.reduce((s, l) => s + l.duration_seconds, 0),
    progress: lessons.length ? Math.round((done / lessons.length) * 100) : 0,
  };
}

async function loadCourses(courseIds: string[], userId: string) {
  const supabase = await createServerSupabase();
  const [{ data: courses }, { data: chapters }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase.from("courses").select("*").in("id", courseIds),
    supabase.from("chapters").select("id, title, position, course_id").in("course_id", courseIds),
    supabase.from("lessons").select(LESSON_PUBLIC_COLUMNS).in("course_id", courseIds),
    supabase.from("progress").select("lesson_id").eq("user_id", userId).not("completed_at", "is", null),
  ]);
  const completed = new Set((progress ?? []).map((p) => p.lesson_id as string));
  return (courses ?? []).map((c) =>
    buildOutline(
      c as CourseRow,
      (chapters ?? []).filter((ch) => ch.course_id === c.id),
      ((lessons ?? []) as LessonRow[]).filter((l) => l.course_id === c.id),
    ),
  ).map((o) => ({ outline: o, completed }));
}

export async function getMyCourses(): Promise<StudentCourse[]> {
  const student = await getStudent();
  const supabase = await createServerSupabase();
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, expires_at")
    .eq("status", "active");
  const ids = (enrollments ?? [])
    .filter((e) => !e.expires_at || new Date(e.expires_at) > new Date())
    .map((e) => e.course_id as string);
  if (ids.length === 0) return [];
  const loaded = await loadCourses(ids, student.id);
  return loaded
    .map(({ outline, completed }) => withStats(outline, completed, true))
    .sort((a, b) => a.position - b.position);
}

export async function getStudentCourse(slug: string): Promise<StudentCourse | null> {
  const student = await getStudent();
  const supabase = await createServerSupabase();
  const { data: course } = await supabase.from("courses").select("id").eq("slug", slug).maybeSingle();
  if (!course) return null;

  const { data: enr } = await supabase
    .from("enrollments")
    .select("expires_at")
    .eq("course_id", course.id)
    .eq("status", "active")
    .maybeSingle();
  const enrolled = !!enr && (!enr.expires_at || new Date(enr.expires_at) > new Date());

  const [loaded] = await loadCourses([course.id], student.id);
  return loaded ? withStats(loaded.outline, loaded.completed, enrolled) : null;
}

/** Video + ghi chú + tài liệu của 1 bài — chỉ trả về khi được phép xem */
export async function getLessonContent(lessonId: string) {
  const student = await getStudent();
  const supabase = await createServerSupabase();
  const { data: allowed } = await supabase.rpc("can_watch_lesson", {
    p_user_id: student.id,
    p_lesson_id: lessonId,
  });
  if (!allowed) return { allowed: false as const };

  const [{ data: lesson }, { data: resources }] = await Promise.all([
    createAdminSupabase().from("lessons").select("bunny_video_id, youtube_id, content").eq("id", lessonId).single(),
    supabase.from("lesson_resources").select("label, href").eq("lesson_id", lessonId).order("position"),
  ]);

  return {
    allowed: true as const,
    embedUrl: lesson ? lessonEmbedUrl(lesson) : null,
    content: (lesson?.content as string | null) ?? null,
    resources: resources ?? [],
  };
}

export function flatLessons(course: CourseOutline) {
  return course.chapters.flatMap((ch) => ch.lessons.map((lesson) => ({ lesson, chapterTitle: ch.title })));
}

export function resumeLesson(course: StudentCourse) {
  const flat = flatLessons(course);
  return (flat.find((x) => !course.completed.has(x.lesson.id)) ?? flat[0])?.lesson ?? null;
}
