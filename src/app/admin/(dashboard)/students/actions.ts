"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { grantCourse } from "@/lib/orders";

export type ImportState = { message?: string; errors?: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function loadCourse(id: string) {
  const { data } = await createAdminSupabase()
    .from("courses")
    .select("id, access_days, gr_campaign_id")
    .eq("id", id)
    .single();
  if (!data) throw new Error("Chưa chọn khóa học");
  return data;
}

/**
 * Cấp quyền hàng loạt — dán danh sách xuất từ Edubit / Excel.
 * Mỗi dòng: email, họ tên, số điện thoại (phân tách bằng dấu phẩy, chấm phẩy hoặc Tab).
 */
export async function importStudents(_prev: ImportState, form: FormData): Promise<ImportState> {
  await assertAdmin();
  const course = await loadCourse(String(form.get("course_id")));
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
    try {
      await grantCourse({ email, name: name || null, phone: phone || null, course });
      ok++;
    } catch (e) {
      errors.push(`${email}: ${(e as Error).message}`);
    }
  }
  revalidatePath("/admin/students");
  return { message: `Đã cấp quyền cho ${ok} học viên`, errors };
}

export async function revokeEnrollment(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("enrollments").update({ status: "expired" }).eq("id", String(form.get("id")));
  revalidatePath("/admin/students");
}

export async function restoreEnrollment(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("enrollments").update({ status: "active" }).eq("id", String(form.get("id")));
  revalidatePath("/admin/students");
}
