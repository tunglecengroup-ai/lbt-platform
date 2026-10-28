"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { fulfillOrder } from "@/lib/orders";

/** Admin xác nhận tay (khách chuyển sai nội dung, chuyển tiền mặt…) */
export async function markOrderPaid(form: FormData) {
  await assertAdmin();
  await fulfillOrder(String(form.get("id")), "manual", "admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/students");
}

export async function cancelOrder(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("orders").update({ status: "cancelled" }).eq("id", String(form.get("id"))).eq("status", "pending");
  revalidatePath("/admin/orders");
}
