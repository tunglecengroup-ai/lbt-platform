import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { parseSections, UTM_KEYS, type Block, type Utm } from "@/lib/landing-blocks";

export type LandingPage = {
  id: string;
  slug: string;
  name: string;
  course_id: string | null;
  plan_id: string | null;
  price_vnd: number | null;
  compare_price_vnd: number | null;
  theme_color: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  sections: Block[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export const LANDING_COLUMNS =
  "id, slug, name, course_id, plan_id, price_vnd, compare_price_vnd, theme_color, seo_title, seo_description, og_image, sections, is_published, created_at, updated_at";

const norm = (row: Record<string, unknown>) => ({ ...(row as LandingPage), sections: parseSections(row.sections) });

export async function getLandingBySlug(slug: string) {
  const { data } = await createAdminSupabase().from("landing_pages").select(LANDING_COLUMNS).eq("slug", slug).maybeSingle();
  return data ? norm(data) : null;
}

export async function getLandingById(id: string) {
  const { data } = await createAdminSupabase().from("landing_pages").select(LANDING_COLUMNS).eq("id", id).maybeSingle();
  return data ? norm(data) : null;
}

export async function listLandings() {
  const { data } = await createAdminSupabase().from("landing_pages").select(LANDING_COLUMNS).order("created_at", { ascending: false });
  return (data ?? []).map(norm);
}

/** Làm sạch UTM nhận từ trình duyệt */
export function cleanUtm(input: Record<string, unknown>): Utm {
  const out: Utm = {};
  for (const k of UTM_KEYS) {
    const v = String(input[k] ?? "").trim().slice(0, 200);
    if (v) out[k] = v;
  }
  return out;
}

// ---------------- THỐNG KÊ ----------------

type EventRow = { landing_id: string; kind: "view" | "checkout"; visitor_id: string | null; utm_source: string | null; utm_campaign: string | null; utm_content: string | null };
type OrderLite = { id: string; code: string; landing_id: string; status: string; amount_vnd: number; customer_name: string | null; customer_phone: string | null; created_at: string; paid_at: string | null; utm_source: string | null; utm_campaign: string | null; utm_content: string | null };

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

export type FunnelStats = { views: number; visitors: number; started: number; orders: number; paid: number; revenue: number };
const empty = (): FunnelStats => ({ views: 0, visitors: 0, started: 0, orders: 0, paid: 0, revenue: 0 });

/** Phễu theo từng trang (và theo nhóm UTM nếu chọn) kể từ mốc `since` (ISO, rỗng = từ trước tới nay) */
export async function landingStats(opts: { since?: string; landingId?: string }) {
  const db = createAdminSupabase();
  const [events, orders] = await Promise.all([
    fetchAll<EventRow>((a, b) => {
      let q = db.from("landing_events").select("landing_id, kind, visitor_id, utm_source, utm_campaign, utm_content");
      if (opts.landingId) q = q.eq("landing_id", opts.landingId);
      if (opts.since) q = q.gte("created_at", opts.since);
      return q.order("id").range(a, b);
    }),
    fetchAll<OrderLite>((a, b) => {
      let q = db
        .from("orders")
        .select("id, code, landing_id, status, amount_vnd, customer_name, customer_phone, created_at, paid_at, utm_source, utm_campaign, utm_content")
        .not("landing_id", "is", null);
      if (opts.landingId) q = q.eq("landing_id", opts.landingId);
      if (opts.since) q = q.gte("created_at", opts.since);
      return q.order("created_at", { ascending: false }).range(a, b);
    }),
  ]);

  const group = (key: (r: { landing_id: string; utm_source: string | null; utm_campaign: string | null; utm_content: string | null }) => string) => {
    const map = new Map<string, FunnelStats & { _v: Set<string>; _s: Set<string> }>();
    const get = (k: string) => {
      let s = map.get(k);
      if (!s) map.set(k, (s = { ...empty(), _v: new Set(), _s: new Set() }));
      return s;
    };
    for (const e of events) {
      const s = get(key(e));
      const vid = e.visitor_id || `anon-${Math.random()}`;
      if (e.kind === "view") {
        s.views++;
        s._v.add(vid);
      } else s._s.add(vid);
    }
    for (const o of orders) {
      const s = get(key(o));
      s.orders++;
      if (o.status === "paid") {
        s.paid++;
        s.revenue += o.amount_vnd;
      }
    }
    return new Map(
      [...map].map(([k, s]) => [k, { views: s.views, visitors: s._v.size, started: s._s.size, orders: s.orders, paid: s.paid, revenue: s.revenue } as FunnelStats]),
    );
  };

  return {
    byLanding: group((r) => r.landing_id),
    byCampaign: group((r) => r.utm_campaign || "(không có utm_campaign)"),
    byContent: group((r) => r.utm_content || "(không có utm_content)"),
    bySource: group((r) => r.utm_source || "(trực tiếp / không UTM)"),
    orders,
  };
}

export const emptyStats = empty;
