import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { Channel } from "@/lib/channels";

async function fetchAll<T>(q: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

type Visit = { channel: string; visitor_id: string | null; is_first: boolean; utm_source: string | null; utm_campaign: string | null; utm_content: string | null };
type Signup = { first_channel: string | null; signup_channel: string | null; signup_utm_campaign: string | null; signup_utm_content: string | null };
type Order = { channel: string | null; first_channel: string | null; status: string; amount_vnd: number; utm_source: string | null; utm_campaign: string | null; utm_content: string | null };

export const UNTRACKED = "chua-ghi-nguon";

export type SourceRow = {
  visits: number;
  newVisitors: number;
  signups: number;
  orders: number;
  paid: number;
  revenue: number;
  /** doanh thu tính cho kênh khách BIẾT TỚI web lần đầu */
  firstRevenue: number;
};
const empty = (): SourceRow => ({ visits: 0, newVisitors: 0, signups: 0, orders: 0, paid: 0, revenue: 0, firstRevenue: 0 });

export async function sourceStats(opts: { since?: string; channel?: string }) {
  const db = createAdminSupabase();
  const [visits, signups, orders] = await Promise.all([
    fetchAll<Visit>((a, b) => {
      let q = db.from("site_visits").select("channel, visitor_id, is_first, utm_source, utm_campaign, utm_content");
      if (opts.since) q = q.gte("created_at", opts.since);
      if (opts.channel) q = q.eq("channel", opts.channel);
      return q.order("id").range(a, b);
    }),
    fetchAll<Signup>((a, b) => {
      let q = db.from("profiles").select("first_channel, signup_channel, signup_utm_campaign, signup_utm_content").not("first_channel", "is", null);
      if (opts.since) q = q.gte("created_at", opts.since);
      return q.order("created_at").range(a, b);
    }),
    fetchAll<Order>((a, b) => {
      let q = db.from("orders").select("channel, first_channel, status, amount_vnd, utm_source, utm_campaign, utm_content");
      if (opts.since) q = q.gte("created_at", opts.since);
      return q.order("created_at").range(a, b);
    }),
  ]);

  const byChannel = new Map<string, SourceRow>();
  const row = (m: Map<string, SourceRow>, k: string) => {
    let r = m.get(k);
    if (!r) m.set(k, (r = empty()));
    return r;
  };
  const seen = new Map<string, Set<string>>();
  for (const v of visits) {
    const r = row(byChannel, v.channel);
    r.visits++;
    if (v.is_first) r.newVisitors++;
    if (v.visitor_id) (seen.get(v.channel) ?? seen.set(v.channel, new Set()).get(v.channel)!).add(v.visitor_id);
  }
  for (const s of signups) row(byChannel, s.first_channel ?? "direct").signups++;
  for (const o of orders) {
    // Đơn tạo trước khi bật đo nguồn -> nhóm riêng, không tính nhầm vào "trực tiếp"
    const r = row(byChannel, o.channel ?? UNTRACKED);
    r.orders++;
    if (o.status === "paid") {
      r.paid++;
      r.revenue += o.amount_vnd;
      row(byChannel, o.first_channel ?? o.channel ?? UNTRACKED).firstRevenue += o.amount_vnd;
    }
  }

  // Chi tiết 1 kênh: theo chiến dịch / nội dung (bài, mẫu quảng cáo)
  const detail = (key: (x: { utm_campaign: string | null; utm_content: string | null }) => string) => {
    const m = new Map<string, SourceRow>();
    if (!opts.channel) return m;
    for (const v of visits) row(m, key(v)).visits++;
    for (const s of signups) if (s.signup_channel === opts.channel) row(m, key({ utm_campaign: s.signup_utm_campaign, utm_content: s.signup_utm_content })).signups++;
    for (const o of orders) {
      if (o.channel !== opts.channel) continue;
      const r = row(m, key(o));
      r.orders++;
      if (o.status === "paid") {
        r.paid++;
        r.revenue += o.amount_vnd;
      }
    }
    return m;
  };

  return {
    byChannel,
    byCampaign: detail((x) => x.utm_campaign || "(không có chiến dịch)"),
    byContent: detail((x) => x.utm_content || "(không có nội dung)"),
    visits,
    orders,
  };
}

/** Số liệu của 1 link theo dõi (khớp utm_source + utm_campaign + utm_content) */
export function linkStats(
  link: { utm_source: string; utm_campaign: string; utm_content: string | null },
  data: { visits: Visit[]; orders: Order[] },
) {
  const hit = (x: { utm_source: string | null; utm_campaign: string | null; utm_content: string | null }) =>
    (x.utm_source ?? "").toLowerCase() === link.utm_source.toLowerCase() &&
    (x.utm_campaign ?? "") === link.utm_campaign &&
    (!link.utm_content || (x.utm_content ?? "") === link.utm_content);
  const os = data.orders.filter(hit);
  return {
    visits: data.visits.filter(hit).length,
    orders: os.length,
    paid: os.filter((o) => o.status === "paid").length,
    revenue: os.filter((o) => o.status === "paid").reduce((s, o) => s + o.amount_vnd, 0),
  };
}

export const emptySource = empty;
export type { Channel };
