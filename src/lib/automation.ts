import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { appBase, emailLayout, isEmailConfigured, notifyTelegram, publicBase, sendEmail, unsubscribeUrl } from "@/lib/email";

/**
 * AUTOMATION CHĂM SÓC KHÁCH HÀNG — theo thông lệ quốc tế của email lifecycle:
 *  • Kích hoạt theo SỰ KIỆN (đăng ký, ghi danh, tạo đơn, thanh toán, thành viên) + theo THỜI GIAN (không học 7 ngày, sắp hết hạn, học xong)
 *  • Điều kiện DỪNG theo mục tiêu (đã mua thì dừng chuỗi mời mua, đã trả tiền thì dừng nhắc đơn, học lại thì dừng nhắc học)
 *  • Không gửi trùng: mỗi người vào 1 kịch bản đúng 1 lần cho 1 sự kiện (dedupe_key)
 *  • Giờ yên lặng 21:00–08:00 (giờ VN) và giới hạn tần suất 1 email chăm sóc / 20 giờ — email GIAO DỊCH được bỏ qua 2 luật này
 *  • Hủy nhận 1 chạm (List-Unsubscribe, RFC 8058) — người đã hủy chỉ còn nhận email giao dịch
 *  • Đo lường từng email: đã gửi / mở / bấm link
 * Chạy: sự kiện gọi enqueueAutomation(); cron /api/cron/automation (15 phút/lần) gọi runAutomation().
 */

export type Trigger =
  | "signup"
  | "enrolled"
  | "order_pending"
  | "order_paid"
  | "inactive"
  | "expiring"
  | "course_completed"
  | "membership_started";

export const TRIGGER_LABEL: Record<Trigger, string> = {
  signup: "Tạo tài khoản (chưa mua)",
  enrolled: "Được mở khóa học",
  order_pending: "Tạo đơn chưa thanh toán",
  order_paid: "Đơn đã thanh toán",
  inactive: "7 ngày không học",
  expiring: "Còn 7 ngày hết hạn khóa",
  course_completed: "Học xong 100% khóa",
  membership_started: "Kích hoạt gói Member",
};

export type AutomationContext = Partial<{
  ten: string;
  khoa_hoc: string;
  course_id: string;
  course_slug: string;
  ma_don: string;
  order_id: string;
  so_tien: string;
  ngay_het_han: string;
  goi_thanh_vien: string;
}>;

const FREQUENCY_HOURS = 20;
const QUIET_START = 21; // 21:00 giờ VN
const QUIET_END = 8; // 08:00 giờ VN

const vnHour = (d: Date) => (d.getUTCHours() + 7) % 24;
/** Lần gần nhất >= d rơi vào khung 08:00–21:00 giờ VN */
function nextSendable(d: Date) {
  const h = vnHour(d);
  if (h >= QUIET_END && h < QUIET_START) return d;
  const out = new Date(d);
  const addDays = h >= QUIET_START ? 1 : 0;
  // 08:00 VN = 01:00 UTC
  out.setUTCDate(out.getUTCDate() + addDays);
  out.setUTCHours(1, Math.floor(Math.random() * 30), 0, 0);
  if (out < d) out.setUTCDate(out.getUTCDate() + 1);
  return out;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Đưa 1 người vào các kịch bản đang BẬT của sự kiện này. Không bao giờ ném lỗi ra ngoài (không làm hỏng luồng mua/đăng ký). */
export async function enqueueAutomation(
  trigger: Trigger,
  input: { email: string; userId?: string | null; context?: AutomationContext; dedupeKey: string },
) {
  try {
    const db = createAdminSupabase();
    const { data: flows } = await db.from("automation_flows").select("id").eq("trigger", trigger).eq("is_active", true);
    if (!flows?.length) return;
    for (const f of flows) {
      const { data: first } = await db
        .from("automation_steps")
        .select("delay_minutes")
        .eq("flow_id", f.id)
        .eq("is_active", true)
        .order("position")
        .limit(1)
        .maybeSingle();
      if (!first) continue;
      await db.from("automation_runs").upsert(
        {
          flow_id: f.id,
          user_id: input.userId ?? null,
          email: input.email.trim().toLowerCase(),
          context: input.context ?? {},
          dedupe_key: input.dedupeKey,
          next_run_at: new Date(Date.now() + first.delay_minutes * 60_000).toISOString(),
        },
        { onConflict: "flow_id,dedupe_key", ignoreDuplicates: true },
      );
    }
  } catch (e) {
    console.error("enqueueAutomation", trigger, e);
  }
}

/** Dừng các kịch bản có mục tiêu `goal` của 1 người (vd đã mua -> dừng chuỗi mời mua) */
export async function stopAutomation(goal: "enrolled" | "order_paid" | "active_again", match: { email?: string; orderId?: string }) {
  try {
    const db = createAdminSupabase();
    const { data: flows } = await db.from("automation_flows").select("id").eq("goal", goal);
    if (!flows?.length) return;
    let q = db
      .from("automation_runs")
      .update({ status: "stopped", stop_reason: `goal:${goal}`, updated_at: new Date().toISOString() })
      .in("flow_id", flows.map((f) => f.id))
      .eq("status", "active");
    if (match.orderId) q = q.eq("context->>order_id", match.orderId);
    else if (match.email) q = q.eq("email", match.email.trim().toLowerCase());
    else return;
    await q;
  } catch (e) {
    console.error("stopAutomation", goal, e);
  }
}

type Run = {
  id: string;
  flow_id: string;
  user_id: string | null;
  email: string;
  context: AutomationContext;
  step_index: number;
  created_at: string;
};
type Step = { id: string; position: number; delay_minutes: number; channel: "email" | "telegram"; subject: string | null; body: string; transactional: boolean };

/** Thay biến {{ten}}, {{link_hoc}}… — giá trị được escape HTML */
export function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, k: string) => esc(vars[k] ?? ""));
}

export function templateVars(email: string, ctx: AutomationContext): Record<string, string> {
  const pub = publicBase();
  const app = appBase();
  return {
    ten: ctx.ten || "anh/chị",
    email,
    khoa_hoc: ctx.khoa_hoc || "khóa học",
    so_tien: ctx.so_tien || "",
    ma_don: ctx.ma_don || "",
    ngay_het_han: ctx.ngay_het_han || "",
    goi_thanh_vien: ctx.goi_thanh_vien || "LBT Member",
    link_hoc: ctx.course_slug ? `${app}/hoc/${ctx.course_slug}` : `${app}/hoc`,
    link_chung_nhan: ctx.course_slug ? `${app}/hoc/chung-nhan/${ctx.course_slug}` : `${app}/hoc`,
    link_trang_chu: pub,
    link_khoa_hoc: `${pub}/#khoa-hoc`,
    link_thanh_vien: `${pub}/thanh-vien`,
    link_don_hang: ctx.order_id ? `${pub}/don-hang/${ctx.order_id}` : pub,
  };
}

/** Gắn link theo dõi bấm + pixel theo dõi mở cho 1 email đã lưu id */
function track(html: string, messageId: string) {
  const app = appBase();
  const withClicks = html.replace(/href="(https?:\/\/[^"]+)"/g, (m, url: string) =>
    url.includes("/api/email/unsubscribe") ? m : `href="${app}/api/email/c/${messageId}?u=${encodeURIComponent(url)}"`,
  );
  return `${withClicks}<img src="${app}/api/email/o/${messageId}" width="1" height="1" alt="" style="display:none">`;
}

/** Mục tiêu đã đạt chưa (kiểm tra lại lúc gửi, phòng khi bỏ lỡ sự kiện dừng) */
async function goalReached(goal: string | null, run: Run) {
  if (!goal) return false;
  const db = createAdminSupabase();
  if (goal === "enrolled" && run.user_id) {
    const { count } = await db.from("enrollments").select("id", { count: "exact", head: true }).eq("user_id", run.user_id).eq("status", "active");
    return (count ?? 0) > 0;
  }
  if (goal === "order_paid" && run.context.order_id) {
    const { data } = await db.from("orders").select("status").eq("id", run.context.order_id).maybeSingle();
    return !data || data.status !== "pending";
  }
  if (goal === "active_again" && run.user_id) {
    const { count } = await db
      .from("progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", run.user_id)
      .gt("updated_at", run.created_at);
    return (count ?? 0) > 0;
  }
  return false;
}

/** Gửi 1 bước cho 1 người. Trả về id tin nhắn đã ghi. */
export async function deliverStep(step: Step, run: Pick<Run, "id" | "flow_id" | "email" | "context">, opts: { test?: boolean } = {}) {
  const db = createAdminSupabase();
  const vars = templateVars(run.email, run.context);
  const subject = renderTemplate(step.subject || "(không tiêu đề)", vars);

  if (step.channel === "telegram") {
    const text = renderTemplate(step.body.replace(/<[^>]+>/g, ""), vars);
    const r = await notifyTelegram(`${subject}\n${text}`);
    await db.from("automation_messages").insert({
      run_id: opts.test ? null : run.id, step_id: step.id, flow_id: run.flow_id, email: run.email, channel: "telegram",
      subject, status: r.ok ? "sent" : "failed", error: r.ok ? null : r.error,
    });
    return r.ok;
  }

  const { data: msg } = await db
    .from("automation_messages")
    .insert({ run_id: opts.test ? null : run.id, step_id: step.id, flow_id: run.flow_id, email: run.email, subject, status: "skipped" })
    .select("id")
    .single();
  const unsub = step.transactional ? undefined : unsubscribeUrl(run.email);
  const body = renderTemplate(step.body, vars);
  const html = emailLayout(msg ? track(body, msg.id) : body, { unsubscribe: unsub });
  const r = await sendEmail({ to: run.email, subject: opts.test ? `[THỬ] ${subject}` : subject, html, unsubscribe: unsub });
  if (msg) {
    await db
      .from("automation_messages")
      .update(r.ok ? { status: "sent", provider_id: r.id } : { status: "failed", error: r.error })
      .eq("id", msg.id);
  }
  return r.ok;
}

/** Xử lý các bước đến hạn. Gọi từ cron. */
export async function runAutomation(limit = 40) {
  const db = createAdminSupabase();
  const now = new Date();
  const report = { processed: 0, sent: 0, skipped: 0, stopped: 0, deferred: 0, failed: 0 };
  if (!isEmailConfigured()) return { ...report, note: "Chưa có RESEND_API_KEY — không gửi" };

  const { data: runs } = await db
    .from("automation_runs")
    .select("id, flow_id, user_id, email, context, step_index, created_at")
    .eq("status", "active")
    .lte("next_run_at", now.toISOString())
    .order("next_run_at")
    .limit(limit);
  if (!runs?.length) return report;

  const flowIds = [...new Set(runs.map((r) => r.flow_id))];
  const [{ data: flows }, { data: steps }, { data: suppressed }] = await Promise.all([
    db.from("automation_flows").select("id, is_active, goal").in("id", flowIds),
    db.from("automation_steps").select("id, flow_id, position, delay_minutes, channel, subject, body, transactional").in("flow_id", flowIds).eq("is_active", true).order("position"),
    db.from("email_suppressions").select("email").in("email", [...new Set(runs.map((r) => r.email))]),
  ]);
  const flowById = new Map((flows ?? []).map((f) => [f.id, f]));
  const blocked = new Set((suppressed ?? []).map((s) => s.email));

  for (const run of runs as Run[]) {
    report.processed++;
    const flow = flowById.get(run.flow_id);
    const set = (patch: Record<string, unknown>) =>
      db.from("automation_runs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", run.id);

    if (!flow?.is_active) {
      await set({ status: "stopped", stop_reason: "flow_off" });
      report.stopped++;
      continue;
    }
    if (await goalReached(flow.goal, run)) {
      await set({ status: "stopped", stop_reason: `goal:${flow.goal}` });
      report.stopped++;
      continue;
    }
    const flowSteps = ((steps ?? []) as (Step & { flow_id: string })[]).filter((s) => s.flow_id === run.flow_id);
    const step = flowSteps[run.step_index];
    if (!step) {
      await set({ status: "done" });
      continue;
    }

    if (!step.transactional) {
      // Giờ yên lặng
      const sendable = nextSendable(now);
      if (sendable > now) {
        await set({ next_run_at: sendable.toISOString() });
        report.deferred++;
        continue;
      }
      // Giới hạn tần suất email chăm sóc
      const since = new Date(now.getTime() - FREQUENCY_HOURS * 3600_000).toISOString();
      const { count } = await db
        .from("automation_messages")
        .select("id", { count: "exact", head: true })
        .eq("email", run.email)
        .eq("status", "sent")
        .gt("sent_at", since)
        .not("run_id", "is", null);
      if ((count ?? 0) > 0 && step.channel === "email") {
        await set({ next_run_at: nextSendable(new Date(now.getTime() + FREQUENCY_HOURS * 3600_000)).toISOString() });
        report.deferred++;
        continue;
      }
    }

    let ok = true;
    if (step.channel === "email" && !step.transactional && blocked.has(run.email)) {
      await db.from("automation_messages").insert({
        run_id: run.id, step_id: step.id, flow_id: run.flow_id, email: run.email, subject: step.subject, status: "skipped", error: "Đã hủy nhận",
      });
      report.skipped++;
    } else {
      ok = await deliverStep(step, run);
      if (ok) report.sent++;
      else report.failed++;
    }

    const next = flowSteps[run.step_index + 1];
    if (!ok) {
      // Thử lại sau 1 giờ, tối đa đến khi người quản trị xem log
      await set({ next_run_at: new Date(now.getTime() + 3600_000).toISOString() });
    } else if (next) {
      await set({ step_index: run.step_index + 1, next_run_at: new Date(now.getTime() + next.delay_minutes * 60_000).toISOString() });
    } else {
      await set({ step_index: run.step_index + 1, status: "done" });
    }
  }
  return report;
}

/** Quét các sự kiện theo THỜI GIAN (không học 7 ngày, sắp hết hạn, học xong). dedupe_key giúp mỗi sự kiện chỉ chạy 1 lần. */
export async function scanTimeTriggers() {
  const db = createAdminSupabase();
  const now = Date.now();
  const day = 86_400_000;
  const [{ data: enr }, { data: counts }, { data: lessons }, { data: courses }, { data: profiles }] = await Promise.all([
    db.from("enrollments").select("id, user_id, course_id, enrolled_at, expires_at").eq("status", "active"),
    db.rpc("progress_counts"),
    db.from("lessons").select("course_id"),
    db.from("courses").select("id, title, slug"),
    db.from("profiles").select("id, email, full_name"),
  ]);
  const totals = new Map<string, number>();
  for (const l of lessons ?? []) totals.set(l.course_id, (totals.get(l.course_id) ?? 0) + 1);
  const cnt = new Map(((counts ?? []) as { user_id: string; course_id: string; done: number; last_at: string | null }[]).map((c) => [`${c.user_id}|${c.course_id}`, c]));
  const course = new Map((courses ?? []).map((c) => [c.id, c]));
  const profile = new Map((profiles ?? []).map((p) => [p.id, p]));
  const lastByUser = new Map<string, number>();
  for (const c of cnt.values()) if (c.last_at) lastByUser.set(c.user_id, Math.max(lastByUser.get(c.user_id) ?? 0, new Date(c.last_at).getTime()));

  const month = new Date().toISOString().slice(0, 7);
  let queued = 0;
  for (const e of enr ?? []) {
    const p = profile.get(e.user_id);
    const c = course.get(e.course_id);
    if (!p || !c) continue;
    const exp = e.expires_at ? new Date(e.expires_at).getTime() : null;
    if (exp && exp <= now) continue; // đã hết hạn
    const base = { ten: p.full_name ?? undefined, khoa_hoc: c.title, course_id: c.id, course_slug: c.slug };

    // Sắp hết hạn (còn <= 7 ngày)
    if (exp && exp - now <= 7 * day) {
      await enqueueAutomation("expiring", {
        email: p.email, userId: p.id, dedupeKey: `expiring:${e.id}:${e.expires_at!.slice(0, 10)}`,
        context: { ...base, ngay_het_han: new Date(exp).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) },
      });
      queued++;
    }
    // Học xong 100%
    const total = totals.get(e.course_id) ?? 0;
    const k = cnt.get(`${e.user_id}|${e.course_id}`);
    if (total > 0 && (k?.done ?? 0) >= total) {
      await enqueueAutomation("course_completed", { email: p.email, userId: p.id, dedupeKey: `completed:${e.user_id}:${e.course_id}`, context: base });
      queued++;
    }
    // 7 ngày không học (tính theo lần học gần nhất mọi khóa, hoặc ngày ghi danh nếu chưa học) — tối đa 1 lần/tháng/người
    const last = lastByUser.get(e.user_id) ?? new Date(e.enrolled_at).getTime();
    if (now - last >= 7 * day && (k?.done ?? 0) < total) {
      await enqueueAutomation("inactive", { email: p.email, userId: p.id, dedupeKey: `inactive:${e.user_id}:${month}`, context: base });
      queued++;
    }
  }
  return { queued };
}
