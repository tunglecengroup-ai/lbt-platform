"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createOrder, fulfillOrder } from "@/lib/orders";
import { CHANNELS, type Channel } from "@/lib/channels";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const money = (f: FormData, k: string) => Math.max(0, Math.round(Number(str(f, k).replace(/[^\d]/g, "")) || 0));
const refresh = (id?: string) => {
  revalidatePath("/admin/orders");
  if (id) revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
};

/** Admin xác nhận tay (khách chuyển sai nội dung, chuyển tiền mặt…) — mở khóa / gói cho khách */
export async function markOrderPaid(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  await fulfillOrder(id, "manual", "admin");
  refresh(id);
  revalidatePath("/admin/students");
}

export async function cancelOrder(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  await createAdminSupabase().from("orders").update({ status: "cancelled" }).eq("id", id).eq("status", "pending");
  refresh(id);
}

/** Sửa thông tin đơn (khách, số tiền, kênh nguồn, ghi chú, trạng thái hủy/hoàn tiền/chờ) */
export async function updateOrder(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  const channel = str(form, "channel");
  const status = str(form, "status");
  const patch: Record<string, unknown> = {
    customer_name: str(form, "customer_name") || null,
    customer_email: str(form, "customer_email").toLowerCase() || null,
    customer_phone: str(form, "customer_phone") || null,
    amount_vnd: money(form, "amount"),
    channel: channel && channel in CHANNELS ? channel : null,
    utm_campaign: str(form, "utm_campaign") || null,
    utm_content: str(form, "utm_content") || null,
    admin_note: str(form, "admin_note") || null,
  };
  // "Đã thanh toán" phải đi qua nút Xác nhận (để mở khóa cho khách); ở đây chỉ đổi giữa chờ / hủy / hoàn tiền
  if (["pending", "cancelled", "refunded"].includes(status)) patch.status = status;
  const { error } = await createAdminSupabase().from("orders").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  refresh(id);
}

/** Xóa hẳn đơn (không thu hồi khóa đã mở — vào trang Học viên để khóa quyền nếu cần) */
export async function deleteOrder(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  const { error } = await createAdminSupabase().from("orders").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
  redirect("/admin/orders?deleted=1");
}

export type NewOrderState = { error?: string };

/** Tạo đơn tay: khách mua qua inbox / chuyển khoản ngoài / tiền mặt. Tích "đã thanh toán" thì mở khóa luôn. */
export async function adminCreateOrder(_prev: NewOrderState, form: FormData): Promise<NewOrderState> {
  await assertAdmin();
  const name = str(form, "customer_name");
  const email = str(form, "customer_email").toLowerCase();
  const phone = str(form, "customer_phone");
  const item = str(form, "item"); // "c:<course id>" | "p:<plan id>"
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Nhập họ tên và email đúng" };
  if (!/^[cp]:[0-9a-f-]{36}$/i.test(item)) return { error: "Chọn khóa học hoặc gói thành viên" };

  const db = createAdminSupabase();
  const isPlan = item.startsWith("p:");
  const itemId = item.slice(2);
  const { data: it } = isPlan
    ? await db.from("membership_plans").select("id, name, price_vnd").eq("id", itemId).maybeSingle()
    : await db.from("courses").select("id, title, price_vnd").eq("id", itemId).maybeSingle();
  if (!it) return { error: "Không tìm thấy khóa học / gói" };
  const title = "title" in it ? (it.title as string) : (it.name as string);
  const amount = str(form, "amount") ? money(form, "amount") : (it.price_vnd as number);
  const channel = str(form, "channel") as Channel;

  const order = await createOrder({
    courseId: isPlan ? null : itemId,
    planId: isPlan ? itemId : null,
    itemTitle: title,
    amount,
    name,
    email,
    phone,
    utm: str(form, "utm_campaign") ? { utm_campaign: str(form, "utm_campaign") } : undefined,
  });
  await db
    .from("orders")
    .update({ channel: channel in CHANNELS ? channel : null, admin_note: str(form, "admin_note") || "Admin tạo tay" })
    .eq("id", order.id);
  if (form.get("paid") === "on") await fulfillOrder(order.id, "manual", "admin");
  refresh(order.id);
  revalidatePath("/admin/students");
  redirect(`/admin/orders/${order.id}`);
}
