import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type Certificate = {
  id: string;
  code: string;
  user_id: string;
  course_id: string;
  student_name: string;
  course_title: string;
  lessons_completed: number;
  issued_at: string;
  revoked_at: string | null;
};

const COLS = "id, code, user_id, course_id, student_name, course_title, lessons_completed, issued_at, revoked_at";
// Bỏ ký tự dễ nhầm (0/O, 1/I/L)
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function newCode() {
  const b = randomBytes(8);
  const chars = [...b].map((x) => ALPHABET[x % ALPHABET.length]).join("");
  return `LBT-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}

/** Học xong 100% bài của khóa chưa (đếm bài trong khóa vs bài đã đánh dấu xong) */
export async function completionOf(userId: string, courseId: string) {
  const db = createAdminSupabase();
  const [{ count: total }, { count: done }] = await Promise.all([
    db.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    db.from("progress").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("course_id", courseId).not("completed_at", "is", null),
  ]);
  return { total: total ?? 0, done: done ?? 0, complete: (total ?? 0) > 0 && (done ?? 0) >= (total ?? 0) };
}

/** Lấy chứng nhận đã cấp, hoặc cấp mới nếu đã học xong 100%. Trả null nếu chưa đủ điều kiện. */
export async function issueCertificate(userId: string, courseId: string): Promise<Certificate | null> {
  const db = createAdminSupabase();
  const { data: existing } = await db.from("certificates").select(COLS).eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  if (existing) return existing as Certificate;

  const c = await completionOf(userId, courseId);
  if (!c.complete) return null;
  const [{ data: profile }, { data: course }] = await Promise.all([
    db.from("profiles").select("full_name, email").eq("id", userId).single(),
    db.from("courses").select("title").eq("id", courseId).single(),
  ]);
  if (!profile || !course) return null;

  for (let i = 0; i < 5; i++) {
    const { data, error } = await db
      .from("certificates")
      .insert({
        code: newCode(),
        user_id: userId,
        course_id: courseId,
        student_name: profile.full_name || profile.email.split("@")[0],
        course_title: course.title,
        lessons_completed: c.done,
      })
      .select(COLS)
      .single();
    if (!error) return data as Certificate;
    if (error.code !== "23505") throw error;
    // trùng (user, course) do 2 lần bấm cùng lúc -> đọc lại; trùng mã -> thử mã khác
    const { data: again } = await db.from("certificates").select(COLS).eq("user_id", userId).eq("course_id", courseId).maybeSingle();
    if (again) return again as Certificate;
  }
  throw new Error("Không tạo được mã chứng nhận");
}

export async function getCertificateByCode(code: string) {
  if (!/^LBT-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return null;
  const { data } = await createAdminSupabase().from("certificates").select(COLS).eq("code", code).maybeSingle();
  return (data as Certificate | null) ?? null;
}
