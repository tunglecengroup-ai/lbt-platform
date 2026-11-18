import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { enqueueAutomation } from "@/lib/automation";
import { normPhone } from "@/lib/zalo";

/**
 * LEAD ĐĂNG KÝ KHÓA TỪ LADI WEBCAKE — đọc ở Pancake POS (shop Lê Bá Tùng).
 * Mọi form ladi Webcake (các tab "tết 2026", "8T3 SALE"… của Sheet TL GROUP) đều tạo 1 đơn POS nguồn "Webcake",
 * kèm tên, SĐT, email, khóa, link ladi + UTM — và POS có TRẠNG THÁI THANH TOÁN, nên lấy ở đây thay vì đọc Sheet.
 * Env Netlify: POS_API_KEY (+ POS_SHOP_ID, mặc định 1720074466).
 *
 * Luật "đã thanh toán" giống agent quan-ly-quy-trinh (kiem-tra.ps1): không hủy/hoàn (4,5,6) và
 * (trạng thái >= 1 và khác 9) hoặc có tiền trả trước/chuyển khoản.
 */
const POS = "https://pos.pages.fm/api/v1";
const shopId = () => process.env.POS_SHOP_ID || "1720074466";
export const isPosConfigured = () => !!process.env.POS_API_KEY;

type PosOrder = {
  id: number;
  status: number;
  bill_full_name?: string | null;
  bill_phone_number?: string | null;
  bill_email?: string | null;
  prepaid?: number | null;
  transfer_money?: number | null;
  inserted_at: string; // UTC, không hậu tố
  order_sources_name?: string | null;
  link?: string | null;
  note?: string | null;
  p_utm_source?: string | null;
  p_utm_medium?: string | null;
  p_utm_campaign?: string | null;
  p_utm_content?: string | null;
  p_utm_term?: string | null;
  customer?: { emails?: string[] | null } | null;
  items?: { variation_info?: { name?: string | null } | null }[] | null;
};

const num = (v: unknown) => Number(v) || 0;
const isCancel = (o: PosOrder) => [4, 5, 6].includes(Number(o.status));
export const posPaid = (o: PosOrder) => !isCancel(o) && ((Number(o.status) >= 1 && Number(o.status) !== 9) || num(o.prepaid) + num(o.transfer_money) > 0);
const utc = (s: string) => new Date(/[zZ+]/.test(s.slice(-6)) ? s : `${s}Z`);

async function posGet(path: string, params: Record<string, string | number>) {
  const q = new URLSearchParams({ api_key: process.env.POS_API_KEY!, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const res = await fetch(`${POS}/shops/${shopId()}/${path}?${q}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`POS ${res.status}`);
  return (await res.json()) as { data?: PosOrder[]; total_entries?: number };
}

/** Khách (theo SĐT) có đơn POS đã thanh toán từ thời điểm `since` không */
export async function posPaidSince(phone: string, since?: Date) {
  if (!isPosConfigured()) return false;
  try {
    const d = await posGet("orders", { search: phone, page_size: 30 });
    return (d.data ?? []).some((o) => normPhone(o.bill_phone_number) === phone && posPaid(o) && (!since || utc(o.inserted_at) >= since));
  } catch (e) {
    console.error("posPaidSince", e);
    return false;
  }
}

/** Tên khóa trong đơn POS */
const productName = (o: PosOrder) => (o.items ?? []).map((i) => i.variation_info?.name?.trim()).filter(Boolean)[0] || null;

/**
 * Quét đơn Webcake mới trên POS (mặc định 3 giờ gần nhất) -> đưa khách CHƯA thanh toán vào chuỗi "lead-ladi" (email + Zalo).
 * Chạy mỗi 5 phút trong cron. Không đụng tới lead cũ trước khi bật tính năng (chỉ nhìn lùi `hours`).
 * Cùng 1 SĐT + cùng 1 khóa chỉ vào chuỗi 1 lần (khách bấm gửi form 2 lần không bị nhắn 2 lần).
 */
export async function scanPosLeads(hours = 3) {
  if (!isPosConfigured()) return { note: "Chưa có POS_API_KEY" };
  const now = Math.floor(Date.now() / 1000);
  const report = { checked: 0, queued: 0, paid: 0, no_contact: 0 };
  const db = createAdminSupabase();
  for (let page = 1; page <= 5; page++) {
    const d = await posGet("orders", { page_size: 100, page_number: page, startDateTime: now - hours * 3600, endDateTime: now });
    const orders = (d.data ?? []).filter((o) => (o.order_sources_name ?? "").toLowerCase().includes("webcake"));
    for (const o of orders) {
      report.checked++;
      if (isCancel(o)) continue;
      if (posPaid(o)) { report.paid++; continue; }
      const phone = normPhone(o.bill_phone_number);
      const email = (o.bill_email || o.customer?.emails?.[0] || "").trim().toLowerCase();
      if (!phone && !email.includes("@")) { report.no_contact++; continue; }
      const product = productName(o);
      const name = o.bill_full_name && o.bill_full_name !== "No name" ? o.bill_full_name : null;

      const { data: exists } = await db.from("leads").select("id").eq("external_id", `pos:${o.id}`).maybeSingle();
      if (!exists) {
        await db.from("leads").insert({
          external_id: `pos:${o.id}`, name, phone, email: email.includes("@") ? email : null, course_title: product, page_url: o.link ?? null, source: "pos-webcake",
          utm: Object.fromEntries(
            (["source", "medium", "campaign", "content", "term"] as const).map((k) => [`utm_${k}`, o[`p_utm_${k}`] ?? null]).filter(([, v]) => v),
          ),
          created_at: utc(o.inserted_at).toISOString(),
        });
      }
      await enqueueAutomation("lead_registered", {
        email: email.includes("@") ? email : "",
        phone,
        dedupeKey: `lead:${(product ?? "khac").toLowerCase()}:${phone ?? email}`,
        context: { ten: name ?? undefined, khoa_hoc: product ?? undefined, ma_don: `POS ${o.id}` },
      });
      report.queued++;
    }
    if ((d.data ?? []).length < 100) break;
  }
  return report;
}
