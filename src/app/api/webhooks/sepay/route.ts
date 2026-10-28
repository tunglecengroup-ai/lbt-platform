import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { extractOrderCode } from "@/lib/payment";
import { fulfillOrder } from "@/lib/orders";

/**
 * Webhook SePay — ngân hàng báo có tiền vào -> tự mở khóa.
 * Cấu hình trên my.sepay.vn > Tích hợp Webhooks:
 *   URL: https://<tên-miền>/api/webhooks/sepay
 *   Kiểu chứng thực: API Key  ->  giá trị = SEPAY_WEBHOOK_KEY
 * SePay gửi header "Authorization: Apikey <key>".
 */
type SepayPayload = {
  id: number;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  code?: string | null;
  content?: string;
  description?: string;
  transferType?: "in" | "out";
  transferAmount?: number;
  referenceCode?: string;
};

export async function POST(request: Request) {
  const key = process.env.SEPAY_WEBHOOK_KEY;
  const auth = request.headers.get("authorization") ?? "";
  if (!key || auth !== `Apikey ${key}`) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  let tx: SepayPayload;
  try {
    tx = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "bad json" }, { status: 400 });
  }
  if (tx.transferType !== "in") return NextResponse.json({ success: true, ignored: "out" });

  const db = createAdminSupabase();
  const amount = Math.round(tx.transferAmount ?? 0);
  const code = extractOrderCode(`${tx.code ?? ""} ${tx.content ?? ""} ${tx.description ?? ""}`);

  // Ghi log trước — unique(provider, provider_tx_id) chặn SePay gửi lặp
  const { data: event, error: logErr } = await db
    .from("payment_events")
    .insert({
      provider: "sepay",
      provider_tx_id: String(tx.id),
      amount_vnd: amount,
      content: tx.content ?? null,
      raw: tx,
    })
    .select("id")
    .single();
  if (logErr) {
    if (logErr.code === "23505") return NextResponse.json({ success: true, duplicate: true });
    throw logErr;
  }

  const setResult = (result: string, orderId?: string) =>
    db.from("payment_events").update({ result, order_id: orderId ?? null }).eq("id", event.id);

  if (!code) {
    await setResult("no_order");
    return NextResponse.json({ success: true, matched: false });
  }

  const { data: order } = await db.from("orders").select("id, amount_vnd, status").eq("code", code).maybeSingle();
  if (!order) {
    await setResult("no_order");
    return NextResponse.json({ success: true, matched: false });
  }
  if (order.status === "paid") {
    await setResult("already_paid", order.id);
    return NextResponse.json({ success: true, matched: true });
  }
  if (amount < order.amount_vnd) {
    // Chuyển thiếu -> để admin xử lý tay
    await setResult("amount_mismatch", order.id);
    return NextResponse.json({ success: true, matched: false });
  }

  await fulfillOrder(order.id, "sepay", tx.referenceCode ?? String(tx.id));
  await setResult("matched", order.id);
  return NextResponse.json({ success: true, matched: true });
}
