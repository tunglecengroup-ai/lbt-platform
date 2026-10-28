"use server";

import { redirect } from "next/navigation";
import { createPublicSupabase } from "@/lib/supabase/public";
import { createOrder, fulfillOrder } from "@/lib/orders";

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

  // Giá lấy từ DB, không tin form
  const { data: course } = await createPublicSupabase()
    .from("courses")
    .select("id, price_vnd")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!course) return { error: "Khóa học không tồn tại" };

  const order = await createOrder({ courseId: course.id, amount: course.price_vnd, name, email, phone });
  if (course.price_vnd === 0) await fulfillOrder(order.id, "free");

  redirect(`/don-hang/${order.id}`);
}
