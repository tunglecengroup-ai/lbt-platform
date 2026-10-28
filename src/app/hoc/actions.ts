"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

/** Đánh dấu / bỏ đánh dấu hoàn thành bài — RLS progress_all_own đảm bảo chỉ ghi của chính mình */
export async function setLessonComplete(lessonId: string, courseId: string, slug: string, completed: boolean) {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Chưa đăng nhập");

  const { error } = await supabase.from("progress").upsert(
    {
      user_id: data.user.id,
      lesson_id: lessonId,
      course_id: courseId,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" },
  );
  if (error) throw error;
  revalidatePath(`/hoc/${slug}`, "layout");
}
