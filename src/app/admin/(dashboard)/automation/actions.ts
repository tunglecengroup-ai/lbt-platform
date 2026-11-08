"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { deliverStep } from "@/lib/automation";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function refresh(flowId?: string) {
  revalidatePath("/admin/automation");
  if (flowId) revalidatePath(`/admin/automation/${flowId}`);
}

export async function toggleFlow(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  await createAdminSupabase().from("automation_flows").update({ is_active: form.get("active") === "1" }).eq("id", id);
  refresh(id);
}

export async function saveFlow(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  await createAdminSupabase()
    .from("automation_flows")
    .update({ name: str(form, "name"), description: str(form, "description") || null })
    .eq("id", id);
  refresh(id);
}

/** "2" + "ngay" -> phút */
function toMinutes(value: string, unit: string) {
  const n = Math.max(0, Number(value.replace(",", ".")) || 0);
  return Math.round(unit === "ngay" ? n * 1440 : unit === "gio" ? n * 60 : n);
}

export async function saveStep(form: FormData) {
  await assertAdmin();
  const flowId = str(form, "flow_id");
  const row = {
    delay_minutes: toMinutes(str(form, "delay"), str(form, "unit")),
    channel: form.get("channel") === "telegram" ? "telegram" : "email",
    subject: str(form, "subject") || null,
    body: String(form.get("body") ?? ""),
    transactional: form.get("transactional") === "on",
    is_active: form.get("is_active") === "on",
  };
  const id = str(form, "id");
  const db = createAdminSupabase();
  if (id) {
    await db.from("automation_steps").update(row).eq("id", id);
  } else {
    const { count } = await db.from("automation_steps").select("id", { count: "exact", head: true }).eq("flow_id", flowId);
    await db.from("automation_steps").insert({ ...row, flow_id: flowId, position: (count ?? 0) + 1 });
  }
  refresh(flowId);
}

export async function deleteStep(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("automation_steps").delete().eq("id", str(form, "id"));
  refresh(str(form, "flow_id"));
}

export type TestState = { message?: string; error?: string };

/** Gửi thử 1 bước tới email bất kỳ (tiêu đề có [THỬ], dữ liệu mẫu) */
export async function sendTestStep(_prev: TestState, form: FormData): Promise<TestState> {
  await assertAdmin();
  const to = str(form, "to").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { error: "Email nhận thử chưa đúng" };
  const { data: step } = await createAdminSupabase()
    .from("automation_steps")
    .select("id, flow_id, position, delay_minutes, channel, subject, body, transactional")
    .eq("id", str(form, "step_id"))
    .single();
  if (!step) return { error: "Không thấy bước" };
  const ok = await deliverStep(step as Parameters<typeof deliverStep>[0], {
    id: "test",
    flow_id: step.flow_id,
    email: to,
    context: { ten: "Anh Tùng", khoa_hoc: "Facebook Ads Từ Cơ Bản Đến Nâng Cao", course_slug: "facebook-ads-co-ban-den-nang-cao", ma_don: "LBT123456", so_tien: "199.000 ₫", ngay_het_han: "31/12/2026", goi_thanh_vien: "LBT Member 12 tháng" },
  }, { test: true });
  refresh(step.flow_id);
  return ok ? { message: `Đã gửi thử tới ${to}` } : { error: "Gửi thất bại — xem lỗi ở nhật ký bên dưới (thường do chưa có RESEND_API_KEY)" };
}

export async function removeSuppression(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("email_suppressions").delete().eq("email", str(form, "email"));
  refresh();
}
