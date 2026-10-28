import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { addToGetResponse } from "@/lib/getresponse";
import { newOrderCode } from "@/lib/payment";
import type { CourseRow, OrderRow } from "@/lib/types";

const normEmail = (e: string) => e.trim().toLowerCase();

/** Tạo đơn chờ thanh toán. Thử lại vài lần nếu trùng mã. */
export async function createOrder(input: {
  courseId: string;
  amount: number;
  name: string;
  email: string;
  phone: string;
}) {
  const db = createAdminSupabase();
  for (let i = 0; i < 5; i++) {
    const { data, error } = await db
      .from("orders")
      .insert({
        code: newOrderCode(),
        course_id: input.courseId,
        amount_vnd: input.amount,
        customer_name: input.name,
        customer_email: normEmail(input.email),
        customer_phone: input.phone,
        status: "pending",
      })
      .select("*")
      .single();
    if (!error) return data as OrderRow;
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

/** Cấp quyền học 1 khóa (dùng cho thanh toán xong, admin cấp tay, nhập từ Edubit) */
export async function grantCourse(opts: {
  email: string;
  name?: string | null;
  phone?: string | null;
  course: Pick<CourseRow, "id" | "access_days" | "gr_campaign_id">;
}) {
  const db = createAdminSupabase();
  const userId = await ensureStudent(opts.email, opts.name, opts.phone);
  const expires = opts.course.access_days
    ? new Date(Date.now() + opts.course.access_days * 86_400_000).toISOString()
    : null;

  const { error } = await db.from("enrollments").upsert(
    { user_id: userId, course_id: opts.course.id, status: "active", expires_at: expires },
    { onConflict: "user_id,course_id" },
  );
  if (error) throw error;

  await addToGetResponse({
    email: opts.email,
    name: opts.name,
    campaignId: opts.course.gr_campaign_id,
  }).catch((err) => console.error("GetResponse", err));

  return userId;
}

/** Đánh dấu đơn đã thanh toán + mở khóa. An toàn khi gọi lặp (đơn paid rồi thì bỏ qua). */
export async function fulfillOrder(orderId: string, method: string, txRef?: string | null) {
  const db = createAdminSupabase();
  const { data: order } = await db.from("orders").select("*").eq("id", orderId).single();
  if (!order) throw new Error("Không thấy đơn");
  if (order.status === "paid") return order as OrderRow;

  const { data: course } = await db
    .from("courses")
    .select("id, access_days, gr_campaign_id")
    .eq("id", order.course_id)
    .single();
  if (!course) throw new Error("Đơn không gắn khóa học");

  const userId = await grantCourse({
    email: order.customer_email,
    name: order.customer_name,
    phone: order.customer_phone,
    course,
  });

  const { data: updated, error } = await db
    .from("orders")
    .update({
      status: "paid",
      user_id: userId,
      payment_method: method,
      tx_reference: txRef ?? null,
      paid_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw error;
  return updated as OrderRow;
}
