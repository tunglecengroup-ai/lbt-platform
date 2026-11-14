import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { AutomationContext } from "@/lib/automation";

/**
 * NHÓM KHÁCH cho chiến dịch gửi theo nhóm (broadcast). Mỗi người chỉ vào 1 chiến dịch 1 lần.
 * Người đã hủy nhận email chăm sóc tự bị bỏ qua lúc gửi (runAutomation).
 */
export type SegmentType = "all_accounts" | "students" | "course" | "no_purchase" | "members" | "pending_orders" | "channel";
export type Segment = { type?: SegmentType; course_id?: string; channel?: string; days?: number };

export const SEGMENT_LABEL: Record<SegmentType, string> = {
  all_accounts: "Tất cả tài khoản học viên",
  students: "Học viên đang có khóa trả phí còn hạn",
  course: "Học viên của 1 khóa (còn hạn)",
  no_purchase: "Đăng ký tài khoản nhưng chưa mua (chỉ có khóa tặng)",
  members: "Thành viên Member còn hạn",
  pending_orders: "Khách tạo đơn nhưng chưa thanh toán",
  channel: "Khách đến từ 1 kênh (Facebook, TikTok, YouTube…)",
};

export type Recipient = { email: string; userId: string | null; context: AutomationContext };

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

export async function segmentRecipients(seg: Segment): Promise<Recipient[]> {
  const db = createAdminSupabase();
  const now = new Date();
  const nowIso = now.toISOString();
  type P = { id: string; email: string; full_name: string | null; created_at: string | null; first_channel: string | null };
  const profiles = await fetchAll<P>((a, b) => db.from("profiles").select("id, email, full_name, created_at, first_channel").order("created_at").range(a, b));
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const out = new Map<string, Recipient>();
  const add = (p: P | undefined, ctx: AutomationContext = {}) => {
    if (!p?.email) return;
    const email = p.email.trim().toLowerCase();
    if (!out.has(email)) out.set(email, { email, userId: p.id, context: { ten: p.full_name ?? undefined, ...ctx } });
  };

  switch (seg.type) {
    case "all_accounts":
      profiles.forEach((p) => add(p));
      break;
    case "channel":
      profiles.filter((p) => p.first_channel === seg.channel).forEach((p) => add(p));
      break;
    case "students":
    case "course":
    case "no_purchase": {
      type E = { user_id: string; course_id: string; expires_at: string | null; source: string | null; status: string };
      const [enr, { data: courses }] = await Promise.all([
        fetchAll<E>((a, b) => db.from("enrollments").select("user_id, course_id, expires_at, source, status").eq("status", "active").range(a, b)),
        db.from("courses").select("id, title, slug"),
      ]);
      const course = new Map((courses ?? []).map((c) => [c.id, c]));
      const live = enr.filter((e) => !e.expires_at || e.expires_at > nowIso);
      if (seg.type === "no_purchase") {
        const paid = new Set(enr.filter((e) => e.source !== "tang-khi-dang-ky").map((e) => e.user_id));
        profiles.filter((p) => !paid.has(p.id)).forEach((p) => add(p));
      } else {
        for (const e of live) {
          if (seg.type === "students" && e.source === "tang-khi-dang-ky") continue;
          if (seg.type === "course" && e.course_id !== seg.course_id) continue;
          const c = course.get(e.course_id);
          add(byId.get(e.user_id), c ? { khoa_hoc: c.title, course_id: c.id, course_slug: c.slug } : {});
        }
      }
      break;
    }
    case "members": {
      const { data } = await db.from("memberships").select("user_id, expires_at, membership_plans(name)").eq("status", "active").gt("expires_at", nowIso);
      for (const m of (data ?? []) as unknown as { user_id: string; expires_at: string; membership_plans: { name: string } | null }[]) {
        add(byId.get(m.user_id), {
          goi_thanh_vien: m.membership_plans?.name,
          ngay_het_han: new Date(m.expires_at).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
        });
      }
      break;
    }
    case "pending_orders": {
      const since = new Date(now.getTime() - (seg.days || 30) * 86_400_000).toISOString();
      const { data } = await db
        .from("orders")
        .select("id, code, amount_vnd, customer_name, customer_email, user_id, courses(title, slug), membership_plans(name)")
        .eq("status", "pending")
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      // Bỏ khách đã có đơn đã trả sau đó
      const { data: paid } = await db.from("orders").select("customer_email").eq("status", "paid").gte("created_at", since);
      const paidEmails = new Set((paid ?? []).map((o) => (o.customer_email ?? "").toLowerCase()));
      for (const o of (data ?? []) as unknown as {
        id: string; code: string; amount_vnd: number; customer_name: string | null; customer_email: string | null; user_id: string | null;
        courses: { title: string; slug: string } | null; membership_plans: { name: string } | null;
      }[]) {
        const email = (o.customer_email ?? "").toLowerCase();
        if (!email || paidEmails.has(email) || out.has(email)) continue;
        out.set(email, {
          email,
          userId: o.user_id,
          context: {
            ten: o.customer_name ?? undefined,
            khoa_hoc: o.courses?.title ?? o.membership_plans?.name,
            course_slug: o.courses?.slug,
            ma_don: o.code,
            order_id: o.id,
            so_tien: new Intl.NumberFormat("vi-VN").format(o.amount_vnd) + " ₫",
          },
        });
      }
      break;
    }
  }
  return [...out.values()];
}
