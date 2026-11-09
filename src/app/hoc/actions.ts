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

/**
 * Gọi sau khi xác nhận mã đăng nhập/đăng ký: tài khoản MỚI (tạo trong 2 ngày) chưa có khóa nào
 * -> vào kịch bản "Chào mừng tài khoản mới". dedupe theo user nên gọi nhiều lần cũng chỉ 1 lần.
 */
export async function afterSignIn() {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user?.email) return;
    if (Date.now() - new Date(user.created_at).getTime() > 2 * 86_400_000) return;
    // Khóa tặng khi đăng ký không tính là "đã mua"
    const { count } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .or("source.is.null,source.neq.tang-khi-dang-ky");
    if ((count ?? 0) > 0) return;
    const { enqueueAutomation } = await import("@/lib/automation");
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    await enqueueAutomation("signup", {
      email: user.email,
      userId: user.id,
      dedupeKey: `signup:${user.id}`,
      context: { ten: profile?.full_name ?? undefined },
    });
  } catch (e) {
    console.error("afterSignIn", e);
  }
}
