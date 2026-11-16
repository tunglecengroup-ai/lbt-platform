import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * POST /api/hoc/xem — trình phát gửi số giây VỪA XEM thêm của 1 bài (gửi mỗi ~15 giây + khi rời trang, bằng sendBeacon).
 * Body: { lessonId, seconds }. Cộng dồn vào progress.watched_seconds, tối đa = thời lượng bài (để tính % đã xem).
 * Chỉ ghi cho chính người đang đăng nhập (RLS progress_all_own).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { lessonId?: string; seconds?: number } | null;
  const lessonId = String(body?.lessonId ?? "");
  const add = Math.floor(Number(body?.seconds ?? 0));
  if (!/^[0-9a-f-]{36}$/i.test(lessonId) || !(add > 0)) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { data: lesson } = await createAdminSupabase().from("lessons").select("course_id, duration_seconds").eq("id", lessonId).maybeSingle();
  if (!lesson) return NextResponse.json({ ok: false }, { status: 404 });
  // 1 lần gửi không quá 120 giây (chặn số ảo); tổng không vượt thời lượng bài
  const cap = lesson.duration_seconds && lesson.duration_seconds > 0 ? lesson.duration_seconds : 4 * 3600;

  const { data: cur } = await supabase.from("progress").select("watched_seconds").eq("user_id", data.user.id).eq("lesson_id", lessonId).maybeSingle();
  const watched = Math.min(cap, (cur?.watched_seconds ?? 0) + Math.min(add, 120));
  const { error } = await supabase.from("progress").upsert(
    { user_id: data.user.id, lesson_id: lessonId, course_id: lesson.course_id, watched_seconds: watched, updated_at: new Date().toISOString() },
    { onConflict: "user_id,lesson_id" },
  );
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true, watched });
}
