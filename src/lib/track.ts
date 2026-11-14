/**
 * Theo dõi chuyển đổi phía trình duyệt — GA4 (gtag) + Meta Pixel (fbq). An toàn khi chưa cài ID (không làm gì).
 * Tên sự kiện theo chuẩn GA4; tự đổi sang sự kiện chuẩn của Meta.
 */
type Gtag = (...args: unknown[]) => void;
type Fbq = ((...args: unknown[]) => void) & { callMethod?: unknown };
declare global {
  interface Window {
    gtag?: Gtag;
    fbq?: Fbq;
    dataLayer?: unknown[];
  }
}

export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || "";
export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
export const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "";
export const ADS_PURCHASE_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || "";
export const trackingEnabled = () => !!(GA4_ID || PIXEL_ID || ADS_ID);

export type TrackItem = { id: string; name: string; price: number; category?: string };

type EventMap = {
  view_item: { item: TrackItem };
  begin_checkout: { item: TrackItem };
  sign_up: { method?: string };
  /** Khách bấm nút nhắn tin (Messenger / Zalo) */
  contact: { channel: "messenger" | "zalo" };
  purchase: { transactionId: string; value: number; item: TrackItem };
};

const META: Record<keyof EventMap, string> = {
  view_item: "ViewContent",
  begin_checkout: "InitiateCheckout",
  sign_up: "CompleteRegistration",
  contact: "Contact",
  purchase: "Purchase",
};

export function track<K extends keyof EventMap>(event: K, data: EventMap[K]) {
  if (typeof window === "undefined") return;
  const item = "item" in data ? (data as { item: TrackItem }).item : null;
  const value = "value" in data ? (data as { value: number }).value : item?.price;
  const gaItems = item ? [{ item_id: item.id, item_name: item.name, item_category: item.category, price: item.price, quantity: 1 }] : undefined;

  if (window.gtag && (GA4_ID || ADS_ID)) {
    const params: Record<string, unknown> = { currency: "VND", value, items: gaItems };
    if (event === "purchase") params.transaction_id = (data as EventMap["purchase"]).transactionId;
    if (event === "sign_up") params.method = (data as EventMap["sign_up"]).method ?? "email";
    if (event === "contact") { params.method = (data as EventMap["contact"]).channel; delete params.value; delete params.currency; }
    window.gtag("event", event, params);
    if (event === "purchase" && ADS_ID && ADS_PURCHASE_LABEL) {
      window.gtag("event", "conversion", { send_to: `${ADS_ID}/${ADS_PURCHASE_LABEL}`, value, currency: "VND", transaction_id: params.transaction_id });
    }
  }
  if (window.fbq && PIXEL_ID) {
    const params: Record<string, unknown> = item
      ? { content_ids: [item.id], content_name: item.name, content_type: "product", value, currency: "VND" }
      : {};
    // eventID trùng với Conversions API phía máy chủ -> Meta tự loại trùng
    const opts = event === "purchase" ? { eventID: `purchase_${(data as EventMap["purchase"]).transactionId}` } : undefined;
    window.fbq("track", META[event], params, opts);
  }
}
