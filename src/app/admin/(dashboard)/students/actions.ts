"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { grantCourse } from "@/lib/orders";
import { redirect } from "next/navigation";

export type ImportState = { message?: string; errors?: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function loadCourses(ids: string[]) {
  if (ids.length === 0) return [];
  const { data } = await createAdminSupabase()
    .from("courses")
    .select("id, title, access_days, gr_campaign_id")
    .in("id", ids);
  return data ?? [];
}

/**
 * Cấp quyền hàng loạt — dán danh sách xuất từ Edubit / Excel.
 * Mỗi dòng: email, họ tên, số điện thoại (phân tách bằng dấu phẩy, chấm phẩy hoặc Tab).
 */
export async function importStudents(_prev: ImportState, form: FormData): Promise<ImportState> {
  await assertAdmin();
  const courses = await loadCourses(form.getAll("course_id").map(String).filter(Boolean));
  if (courses.length === 0) return { errors: ["Chưa chọn khóa học nào"] };
  const lines = String(form.get("rows") ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let ok = 0;
  const errors: string[] = [];
  for (const line of lines) {
    const [email = "", name = "", phone = ""] = line.split(/[,;\t]/).map((s) => s.trim());
    if (!EMAIL_RE.test(email)) {
      if (!/email/i.test(email)) errors.push(`Bỏ qua (email sai): ${line}`); // dòng tiêu đề thì im lặng bỏ qua
      continue;
    }
    let granted = 0;
    for (const course of courses) {
      try {
        await grantCourse({ email, name: name || null, phone: phone || null, course });
        granted++;
      } catch (e) {
        errors.push(`${email} — ${course.title}: ${(e as Error).message}`);
      }
    }
    if (granted) ok++;
  }
  revalidatePath("/admin/students");
  return { message: `Đã cấp quyền ${courses.length} khóa cho ${ok} học viên`, errors };
}

export async function revokeEnrollment(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("enrollments").update({ status: "expired" }).eq("id", String(form.get("id")));
  revalidatePath("/admin/students", "layout");
}

export async function restoreEnrollment(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("enrollments").update({ status: "active" }).eq("id", String(form.get("id")));
  revalidatePath("/admin/students", "layout");
}

/** Trang chi tiết học viên: tick khóa -> cấp quyền ngay, không cần nhập email */
export async function addCoursesToStudent(_prev: ImportState, form: FormData): Promise<ImportState> {
  await assertAdmin();
  const userId = String(form.get("user_id"));
  const { data: profile } = await createAdminSupabase()
    .from("profiles")
    .select("email, full_name, phone")
    .eq("id", userId)
    .single();
  if (!profile) return { errors: ["Không tìm thấy học viên"] };

  const courses = await loadCourses(form.getAll("course_id").map(String).filter(Boolean));
  if (courses.length === 0) return { errors: ["Chưa chọn khóa học nào"] };

  let ok = 0;
  const errors: string[] = [];
  for (const course of courses) {
    try {
      // không truyền tên/sđt để khỏi ghi đè hồ sơ hiện có
      await grantCourse({ email: profile.email, course });
      ok++;
    } catch (e) {
      errors.push(`${course.title}: ${(e as Error).message}`);
    }
  }
  revalidatePath("/admin/students", "layout");
  return { message: ok ? `Đã thêm ${ok} khóa cho ${profile.full_name || profile.email}` : undefined, errors };
}

/** Xóa hẳn 1 quyền học (khác "Khóa quyền" là tạm khóa, mở lại được) */
export async function deleteEnrollment(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("enrollments").delete().eq("id", String(form.get("id")));
  revalidatePath("/admin/students", "layout");
}

/** Xóa học viên khỏi hệ thống: tài khoản đăng nhập + hồ sơ + quyền học + tiến độ (đơn hàng giữ lại để đối soát) */
export async function deleteStudent(form: FormData) {
  await assertAdmin();
  const userId = String(form.get("user_id"));
  const { error } = await createAdminSupabase().auth.admin.deleteUser(userId);
  if (error) throw new Error(`Không xóa được tài khoản: ${error.message}`);
  revalidatePath("/admin/students", "layout");
  redirect("/admin/students?deleted=1");
}
