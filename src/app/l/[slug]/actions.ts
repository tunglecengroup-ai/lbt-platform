"use server";

import { readAttribution } from "@/lib/attribution";
import { redirect } from "next/navigation";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { cleanUtm, getLandingById } from "@/lib/landing";
import { createOrder, fulfillOrder } from "@/lib/orders";

export type LandingCheckoutState = { error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Đặt mua từ trang bán: giá lấy từ trang (hoặc khóa/gói) trong DB, không tin form. Đơn nhớ trang + UTM. */
export async function landingCheckout(_prev: LandingCheckoutState, form: FormData): Promise<LandingCheckoutState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const phone = String(form.get("phone") ?? "").replace(/[^\d+]/g, "");
  if (name.length < 2) return { error: "Vui lòng nhập họ tên" };
  if (!EMAIL_RE.test(email)) return { error: "Email chưa đúng — đây là email dùng để đăng nhập học" };
  if (phone.length < 9) return { error: "Vui lòng nhập số điện thoại" };

  const landing = await getLandingById(String(form.get("landing_id") ?? ""));
  if (!landing || !landing.is_published) return { error: "Trang đăng ký đã đóng" };

  const db = createAdminSupabase();
  let item: { courseId?: string; planId?: string; title: string; price: number } | null = null;
  if (landing.plan_id) {
    const { data } = await db.from("membership_plans").select("id, name, price_vnd").eq("id", landing.plan_id).maybeSingle();
    if (data) item = { planId: data.id, title: data.name, price: data.price_vnd };
  } else if (landing.course_id) {
    const { data } = await db.from("courses").select("id, title, price_vnd").eq("id", landing.course_id).maybeSingle();
    if (data) item = { courseId: data.id, title: data.title, price: data.price_vnd };
  }
  if (!item) return { error: "Trang chưa gắn khóa học — báo quản trị viên" };
  const amount = landing.price_vnd ?? item.price;

  const utm: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) if (k.startsWith("utm_")) utm[k] = v;

  const order = await createOrder({
    courseId: item.courseId,
    planId: item.planId,
    itemTitle: item.title,
    amount,
    name,
    email,
    phone,
    attribution: await readAttribution(),
    landingId: landing.id,
    utm: cleanUtm(utm),
  });
  if (amount === 0) await fulfillOrder(order.id, "free");
  redirect(`/don-hang/${order.id}`);
}
