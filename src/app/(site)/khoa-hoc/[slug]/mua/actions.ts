"use server";

import { readAttribution } from "@/lib/attribution";
import { redirect } from "next/navigation";
import { createPublicSupabase } from "@/lib/supabase/public";
import { createOrder, fulfillOrder, getPlanBySlug } from "@/lib/orders";

export type CheckoutState = { error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function checkout(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const slug = String(form.get("slug") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const phone = String(form.get("phone") ?? "").replace(/[^\d+]/g, "");

  if (name.length < 2) return { error: "Vui lòng nhập họ tên" };
  if (!EMAIL_RE.test(email)) return { error: "Email chưa đúng — đây là email dùng để đăng nhập học" };
  if (phone.length < 9) return { error: "Vui lòng nhập số điện thoại" };

  // Mua gói thành viên (trang /thanh-vien/<slug>/mua dùng chung form này)
  if (form.get("kind") === "plan") {
    const plan = await getPlanBySlug(slug);
    if (!plan) return { error: "Gói thành viên không tồn tại" };
    const order = await createOrder({ planId: plan.id, itemTitle: plan.name, amount: plan.price_vnd, name, email, phone, attribution: await readAttribution() });
    if (plan.price_vnd === 0) await fulfillOrder(order.id, "free");
    redirect(`/don-hang/${order.id}`);
  }

  // Giá lấy từ DB, không tin form
  const { data: course } = await createPublicSupabase()
    .from("courses")
    .select("id, title, price_vnd")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!course) return { error: "Khóa học không tồn tại" };

  const order = await createOrder({ courseId: course.id, itemTitle: course.title, amount: course.price_vnd, name, email, phone, attribution: await readAttribution() });
  if (course.price_vnd === 0) await fulfillOrder(order.id, "free");

  redirect(`/don-hang/${order.id}`);
}
