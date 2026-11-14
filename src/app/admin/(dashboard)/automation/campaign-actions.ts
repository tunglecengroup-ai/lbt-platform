"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { segmentRecipients, type Segment } from "@/lib/automation-segments";

/** Quản lý CHIẾN DỊCH automation: tạo, cài đặt, nhân bản, xóa, đổi thứ tự bước, gửi theo nhóm khách */

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const TRIGGERS = ["signup", "enrolled", "order_pending", "order_paid", "inactive", "expiring", "course_completed", "membership_started"];
const GOALS = ["", "enrolled", "order_paid", "active_again"];

function refresh(id?: string) {
  revalidatePath("/admin/automation");
  if (id) revalidatePath(`/admin/automation/${id}`);
}

/** Tạo chiến dịch mới (tắt sẵn — soạn bước xong mới bật) */
export async function createFlow(form: FormData) {
  await assertAdmin();
  const name = str(form, "name");
  if (!name) return;
  const kind = form.get("kind") === "broadcast" ? "broadcast" : "trigger";
  const trigger = TRIGGERS.includes(str(form, "trigger")) ? str(form, "trigger") : "signup";
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("automation_flows")
    .insert({
      key: `${slugify(name).slice(0, 40) || "chien-dich"}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      kind,
      trigger: kind === "broadcast" ? "manual" : trigger,
      is_active: false,
      segment: kind === "broadcast" ? { type: "students" } : {},
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await db.from("automation_steps").insert({
    flow_id: data.id, position: 1, delay_minutes: 0, channel: "email",
    subject: "Chào {{ten}}", body: "<p>Chào {{ten}},</p><p></p><p>Lê Bá Tùng</p>", is_active: true,
  });
  refresh();
  redirect(`/admin/automation/${data.id}`);
}

/** Cài đặt: tên, mô tả, sự kiện kích hoạt, điều kiện dừng, chỉ áp dụng cho khóa nào, nhóm khách */
export async function saveFlowSettings(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  const db = createAdminSupabase();
  const { data: flow } = await db.from("automation_flows").select("kind").eq("id", id).single();
  const patch: Record<string, unknown> = {
    name: str(form, "name"),
    description: str(form, "description") || null,
    goal: GOALS.includes(str(form, "goal")) ? str(form, "goal") || null : null,
    course_ids: form.getAll("course_ids").map(String).filter(Boolean),
    updated_at: new Date().toISOString(),
  };
  if (flow?.kind === "broadcast") {
    patch.segment = {
      type: str(form, "segment_type") || "students",
      course_id: str(form, "segment_course") || undefined,
      channel: str(form, "segment_channel") || undefined,
      days: Number(str(form, "segment_days")) || 30,
    };
  } else if (TRIGGERS.includes(str(form, "trigger"))) {
    patch.trigger = str(form, "trigger");
  }
  const { error } = await db.from("automation_flows").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  refresh(id);
}

/** Nhân bản chiến dịch cùng các bước — bản sao để tắt */
export async function duplicateFlow(form: FormData) {
  await assertAdmin();
  const db = createAdminSupabase();
  const { data: f } = await db.from("automation_flows").select("*").eq("id", str(form, "id")).single();
  if (!f) return;
  const { data: steps } = await db.from("automation_steps").select("*").eq("flow_id", f.id).order("position");
  const { data: copy, error } = await db
    .from("automation_flows")
    .insert({
      key: `${f.key}-ban-sao-${Math.random().toString(36).slice(2, 6)}`,
      name: `${f.name} (bản sao)`,
      description: f.description, kind: f.kind, trigger: f.trigger, goal: f.goal, course_ids: f.course_ids, segment: f.segment, is_active: false,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (steps?.length) {
    await db.from("automation_steps").insert(
      steps.map((s) => ({ flow_id: copy.id, position: s.position, delay_minutes: s.delay_minutes, channel: s.channel, subject: s.subject, body: s.body, transactional: s.transactional, is_active: s.is_active })),
    );
  }
  refresh();
  redirect(`/admin/automation/${copy.id}`);
}

/** Xóa hẳn chiến dịch: các bước, người đang chờ và lịch sử gửi của chiến dịch đi theo */
export async function deleteFlow(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("automation_flows").delete().eq("id", str(form, "id"));
  refresh();
  redirect("/admin/automation");
}

/** Đổi thứ tự bước (lên / xuống) */
export async function moveStep(form: FormData) {
  await assertAdmin();
  const flowId = str(form, "flow_id");
  const db = createAdminSupabase();
  const { data: steps } = await db.from("automation_steps").select("id, position").eq("flow_id", flowId).order("position");
  const list = steps ?? [];
  const i = list.findIndex((s) => s.id === str(form, "id"));
  const j = i + (form.get("dir") === "up" ? -1 : 1);
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((s, k) => db.from("automation_steps").update({ position: k + 1 }).eq("id", s.id)));
  refresh(flowId);
}

export type BroadcastState = { message?: string; error?: string };

/** Chiến dịch theo nhóm: đưa cả nhóm khách vào chuỗi (mỗi người 1 lần), gửi dần theo trần email/ngày */
export async function startBroadcast(_prev: BroadcastState, form: FormData): Promise<BroadcastState> {
  await assertAdmin();
  const id = str(form, "id");
  const db = createAdminSupabase();
  const { data: flow } = await db.from("automation_flows").select("id, kind, segment").eq("id", id).single();
  if (!flow || flow.kind !== "broadcast") return { error: "Không phải chiến dịch theo nhóm" };
  const { data: first } = await db.from("automation_steps").select("delay_minutes").eq("flow_id", id).eq("is_active", true).order("position").limit(1).maybeSingle();
  if (!first) return { error: "Chiến dịch chưa có bước nào đang bật" };
  const people = await segmentRecipients(flow.segment as Segment);
  if (!people.length) return { error: "Nhóm khách đang trống" };
  const at = new Date(Date.now() + first.delay_minutes * 60_000).toISOString();
  let added = 0;
  for (let k = 0; k < people.length; k += 500) {
    const chunk = people.slice(k, k + 500).map((p) => ({
      flow_id: id, user_id: p.userId, email: p.email, context: p.context, dedupe_key: `bc:${p.email}`, next_run_at: at,
    }));
    const { data } = await db.from("automation_runs").upsert(chunk, { onConflict: "flow_id,dedupe_key", ignoreDuplicates: true }).select("id");
    added += data?.length ?? 0;
  }
  await db.from("automation_flows").update({ is_active: true, last_broadcast_at: new Date().toISOString(), last_broadcast_count: added }).eq("id", id);
  refresh(id);
  return {
    message: `Đã đưa ${added} người mới vào chiến dịch${people.length > added ? ` (${people.length - added} người đã nhận trước đó được bỏ qua)` : ""}. Hệ thống gửi dần trong khung 8:00–21:00, theo trần email mỗi ngày.`,
  };
}
