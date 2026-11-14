import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { addToGetResponse } from "@/lib/getresponse";
import { newOrderCode } from "@/lib/payment";
import type { CourseRow, OrderRow } from "@/lib/types";
import { enqueueAutomation, stopAutomation } from "@/lib/automation";
import { getPlanBySlug, grantMembership, PLAN_COLUMNS, type MembershipPlan } from "@/lib/membership";
import { formatVND } from "@/lib/utils";
import { sendMetaPurchase } from "@/lib/meta-capi";
import { orderSourceColumns } from "@/lib/attribution";
import { channelFromSource, type Attribution } from "@/lib/channels";

const normEmail = (e: string) => e.trim().toLowerCase();

/** Tạo đơn chờ thanh toán. Thử lại vài lần nếu trùng mã. */
export async function createOrder(input: {
  courseId?: string | null;
  planId?: string | null;
  itemTitle?: string;
  amount: number;
  name: string;
  email: string;
  phone: string;
  /** Nguồn đơn: trang bán + UTM quảng cáo */
  landingId?: string | null;
  utm?: Partial<Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term", string>>;
  /** Nguồn khách đọc từ cookie (readAttribution) — kênh lần chạm gần nhất + lần đầu */
  attribution?: Attribution;
}) {
  const db = createAdminSupabase();
  for (let i = 0; i < 5; i++) {
    const { data, error } = await db
      .from("orders")
      .insert({
        code: newOrderCode(),
        course_id: input.courseId ?? null,
        plan_id: input.planId ?? null,
        amount_vnd: input.amount,
        customer_name: input.name,
        customer_email: normEmail(input.email),
        customer_phone: input.phone,
        status: "pending",
        landing_id: input.landingId ?? null,
        ...(input.attribution ? orderSourceColumns(input.attribution) : {}),
        ...(input.utm ?? {}),
        // UTM riêng của trang bán (nếu có) quyết định kênh của đơn
        ...(input.utm?.utm_source ? { channel: channelFromSource(input.utm.utm_source, input.utm.utm_medium) } : {}),
      })
      .select("*")
      .single();
    if (!error) {
      const order = data as OrderRow;
      if (order.amount_vnd > 0) {
        await enqueueAutomation("order_pending", {
          email: order.customer_email ?? input.email,
          dedupeKey: `order:${order.id}`,
          context: { ten: input.name, khoa_hoc: input.itemTitle, ma_don: order.code, order_id: order.id, so_tien: formatVND(order.amount_vnd) },
        });
      }
      return order;
    }
    if (error.code !== "23505") throw error; // 23505 = trùng unique -> thử mã khác
  }
  throw new Error("Không tạo được mã đơn");
}

/** Tìm (hoặc tạo) tài khoản học viên theo email */
export async function ensureStudent(email: string, name?: string | null, phone?: string | null) {
  const db = createAdminSupabase();
  const e = normEmail(email);

  const { data: existing } = await db.from("profiles").select("id").ilike("email", e).maybeSingle();
  let userId = existing?.id as string | undefined;

  if (!userId) {
    const { data, error } = await db.auth.admin.createUser({
      email: e,
      email_confirm: true,
      user_metadata: { full_name: name ?? "" },
    });
    if (error || !data.user) throw error ?? new Error("Không tạo được tài khoản");
    userId = data.user.id;
  }

  const patch: Record<string, string> = {};
  if (name) patch.full_name = name;
  if (phone) patch.phone = phone;
  if (Object.keys(patch).length) await db.from("profiles").update(patch).eq("id", userId);

  return userId;
}

/** Thời hạn học tối đa của MỌI khóa: 12 tháng */
export const MAX_ACCESS_DAYS = 365;
/** Số ngày được học của 1 khóa: theo cài đặt khóa nhưng không quá 12 tháng; để trống = 12 tháng */
export function accessDaysOf(course: { access_days: number | null }) {
  return Math.min(course.access_days && course.access_days > 0 ? course.access_days : MAX_ACCESS_DAYS, MAX_ACCESS_DAYS);
}

/** Cấp quyền học 1 khóa (dùng cho thanh toán xong, admin cấp tay, nhập từ Edubit) */
export async function grantCourse(opts: {
  email: string;
  name?: string | null;
  phone?: string | null;
  course: Pick<CourseRow, "id" | "access_days" | "gr_campaign_id">;
  /** Số ngày học riêng cho lần cấp này (vd từ API ngoài) — vẫn không quá 12 tháng */
  days?: number | null;
}) {
  const db = createAdminSupabase();
  const userId = await ensureStudent(opts.email, opts.name, opts.phone);
  // Mọi khóa học tối đa 12 tháng (không còn học trọn đời).
  // Đang có hạn dài hơn (vd từ gói Member) thì giữ nguyên, không rút ngắn.
  const now = Date.now();
  const days = opts.days && opts.days > 0 ? Math.min(opts.days, MAX_ACCESS_DAYS) : accessDaysOf(opts.course);
  const fresh = now + days * 86_400_000;
  const { data: current } = await db
    .from("enrollments")
    .select("id, status, expires_at")
    .eq("user_id", userId)
    .eq("course_id", opts.course.id)
    .maybeSingle();
  const keep = current?.expires_at ? new Date(current.expires_at).getTime() : 0;
  const expires = new Date(Math.min(Math.max(fresh, keep), now + MAX_ACCESS_DAYS * 86_400_000)).toISOString();
  const wasActive = current?.status === "active" && keep > now;

  const { error } = await db.from("enrollments").upsert(
    { user_id: userId, course_id: opts.course.id, status: "active", expires_at: expires },
    { onConflict: "user_id,course_id" },
  );
  if (error) throw error;

  // Automation: dừng chuỗi "mời mua", bắt đầu chuỗi hướng dẫn học (chỉ khi là lần mở mới)
  await stopAutomation("enrolled", { email: opts.email });
  if (!wasActive) {
    const { data: c } = await db.from("courses").select("title, slug").eq("id", opts.course.id).maybeSingle();
    await enqueueAutomation("enrolled", {
      email: opts.email,
      userId,
      dedupeKey: `enrolled:${userId}:${opts.course.id}:${expires.slice(0, 10)}`,
      context: { ten: opts.name ?? undefined, khoa_hoc: c?.title, course_id: opts.course.id, course_slug: c?.slug },
    });
  }

  await addToGetResponse({
    email: opts.email,
    name: opts.name,
    campaignId: opts.course.gr_campaign_id,
  }).catch((err) => console.error("GetResponse", err));

  return userId;
}

/**
 * Đánh dấu đơn đã thanh toán + mở khóa học / kích hoạt gói thành viên.
 * An toàn khi gọi lặp hoặc đồng thời (webhook gửi lại): "giành" đơn bằng UPDATE ... WHERE status='pending' trước,
 * chỉ lượt giành được mới cấp quyền; cấp lỗi thì trả đơn về pending để thử lại.
 */
export async function fulfillOrder(orderId: string, method: string, txRef?: string | null) {
  const db = createAdminSupabase();
  const { data: claimed } = await db
    .from("orders")
    .update({ status: "paid", payment_method: method, tx_reference: txRef ?? null, paid_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (!claimed) {
    const { data: order } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!order) throw new Error("Không thấy đơn");
    return order as OrderRow; // đã xử lý trước đó (hoặc đơn bị hủy)
  }
  const order = claimed as OrderRow & { plan_id: string | null };

  try {
    let userId: string;
    let itemTitle = "";
    let courseSlug: string | undefined;
    if (order.plan_id) {
      const { data: plan } = await db.from("membership_plans").select(PLAN_COLUMNS).eq("id", order.plan_id).single();
      if (!plan) throw new Error("Đơn gắn gói thành viên không còn tồn tại");
      itemTitle = (plan as MembershipPlan).name;
      ({ userId } = await grantMembership({
        email: order.customer_email!, name: order.customer_name, phone: order.customer_phone,
        plan: plan as MembershipPlan, source: "order", orderId: order.id,
      }));
    } else {
      const { data: course } = await db
        .from("courses")
        .select("id, title, slug, access_days, gr_campaign_id")
        .eq("id", order.course_id)
        .single();
      if (!course) throw new Error("Đơn không gắn khóa học");
      itemTitle = course.title;
      courseSlug = course.slug;
      userId = await grantCourse({ email: order.customer_email!, name: order.customer_name, phone: order.customer_phone, course });
    }

    const { data: updated } = await db.from("orders").update({ user_id: userId }).eq("id", orderId).select("*").single();

    // Tài khoản tạo lúc mua (khách chưa từng đăng ký): lấy nguồn của đơn làm nguồn tài khoản
    const src = order as OrderRow & { channel?: string | null; first_channel?: string | null; utm_campaign?: string | null; utm_content?: string | null; utm_source?: string | null };
    if (src.channel || src.first_channel) {
      await db
        .from("profiles")
        .update({
          first_channel: src.first_channel ?? src.channel,
          signup_channel: src.channel ?? src.first_channel,
          signup_utm_campaign: src.utm_campaign ?? null,
          signup_utm_content: src.utm_content ?? null,
        })
        .eq("id", userId)
        .is("first_channel", null);
    }

    await sendMetaPurchase({
      code: order.code, orderId: order.id, amount_vnd: order.amount_vnd,
      customer_email: order.customer_email, customer_phone: order.customer_phone, customer_name: order.customer_name,
      itemId: order.plan_id ?? order.course_id ?? "unknown", itemName: itemTitle,
    });
    await stopAutomation("order_paid", { orderId: order.id });
    await enqueueAutomation("order_paid", {
      email: order.customer_email!,
      userId,
      dedupeKey: `paid:${order.id}`,
      context: {
        ten: order.customer_name ?? undefined, khoa_hoc: itemTitle, course_slug: courseSlug,
        ma_don: order.code, order_id: order.id, so_tien: formatVND(order.amount_vnd),
      },
    });
    return (updated ?? order) as OrderRow;
  } catch (e) {
    await db.from("orders").update({ status: "pending", paid_at: null }).eq("id", orderId);
    throw e;
  }
}

export { getPlanBySlug };
