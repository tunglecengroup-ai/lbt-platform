"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { newActivationCode, normalizeCode } from "@/lib/activation";

export type CodesState = { message?: string; error?: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function common(form: FormData) {
  const courseId = str(form, "course_id");
  if (!courseId) throw new Error("Chưa chọn khóa học");
  const date = str(form, "expires_at");
  return {
    course_id: courseId,
    max_uses: Math.max(1, parseInt(str(form, "max_uses"), 10) || 1),
    note: str(form, "note") || null,
    expires_at: date ? new Date(`${date}T23:59:59+07:00`).toISOString() : null,
  };
}

/** Tạo N mã ngẫu nhiên cho 1 khóa */
export async function generateCodes(_prev: CodesState, form: FormData): Promise<CodesState> {
  await assertAdmin();
  const qty = Math.min(500, Math.max(1, parseInt(str(form, "quantity"), 10) || 1));
  const base = common(form);
  const rows = Array.from({ length: qty }, () => ({ ...base, code: newActivationCode() }));
  const { error } = await createAdminSupabase().from("activation_codes").insert(rows);
  if (error) return { error: error.message };
  revalidatePath("/admin/codes");
  return { message: `Đã tạo ${qty} mã` };
}

/** Nhập mã có sẵn (mã cũ bên Edubit, mã tự đặt) — mỗi dòng 1 mã */
export async function importCodes(_prev: CodesState, form: FormData): Promise<CodesState> {
  await assertAdmin();
  const base = common(form);
  const codes = [...new Set(str(form, "codes").split(/[\s,;]+/).map(normalizeCode).filter((c) => c.length >= 4))];
  if (!codes.length) return { error: "Chưa có mã nào hợp lệ (tối thiểu 4 ký tự)" };
  const { data, error } = await createAdminSupabase()
    .from("activation_codes")
    .upsert(codes.map((code) => ({ ...base, code })), { onConflict: "code", ignoreDuplicates: true })
    .select("id");
  if (error) return { error: error.message };
  revalidatePath("/admin/codes");
  const added = data?.length ?? 0;
  return { message: `Đã nhập ${added} mã${added < codes.length ? ` (bỏ qua ${codes.length - added} mã đã có)` : ""}` };
}

export async function deleteCode(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("activation_codes").delete().eq("id", str(form, "id"));
  revalidatePath("/admin/codes");
}
