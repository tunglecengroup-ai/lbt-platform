import "server-only";
import { createHash } from "node:crypto";
import { marketingUrl, siteUrl } from "@/lib/site";

/**
 * Meta Conversions API (gửi sự kiện từ máy chủ) — đơn được ghi nhận kể cả khi trình duyệt chặn Pixel / iOS.
 * Cần NEXT_PUBLIC_META_PIXEL_ID + META_CAPI_TOKEN (Events Manager → Cài đặt → Tạo mã truy cập).
 * event_id trùng với Pixel phía trình duyệt -> Meta tự loại trùng.
 */
const sha = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
/** 0912345678 -> 84912345678 (chuẩn E.164 không dấu +) */
const phoneE164 = (p: string) => {
  const d = p.replace(/\D/g, "");
  return d.startsWith("0") ? `84${d.slice(1)}` : d;
};

export async function sendMetaPurchase(order: {
  code: string;
  amount_vnd: number;
  customer_email: string | null;
  customer_phone: string | null;
  customer_name?: string | null;
  itemId: string;
  itemName: string;
  orderId: string;
}) {
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixel || !token || order.amount_vnd <= 0) return;
  const version = process.env.META_GRAPH_VERSION || "v23.0";
  const user_data: Record<string, string[]> = {};
  if (order.customer_email) user_data.em = [sha(order.customer_email)];
  if (order.customer_phone) user_data.ph = [sha(phoneE164(order.customer_phone))];
  const name = (order.customer_name ?? "").trim().split(/\s+/);
  if (name.length > 1) {
    user_data.fn = [sha(name[name.length - 1])];
    user_data.ln = [sha(name[0])];
  }
  user_data.country = [sha("vn")];

  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: `purchase_${order.code}`,
        action_source: "website",
        event_source_url: `${marketingUrl || siteUrl}/don-hang/${order.orderId}`,
        user_data,
        custom_data: {
          currency: "VND",
          value: order.amount_vnd,
          content_ids: [order.itemId],
          content_name: order.itemName,
          content_type: "product",
          order_id: order.code,
        },
      },
    ],
    ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
  };
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error("Meta CAPI", res.status, (await res.text()).slice(0, 300));
  } catch (e) {
    console.error("Meta CAPI", e);
  }
}
