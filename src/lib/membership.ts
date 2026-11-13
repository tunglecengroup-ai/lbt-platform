import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { addToGetResponse } from "@/lib/getresponse";
import { enqueueAutomation } from "@/lib/automation";
import { MAX_ACCESS_DAYS, ensureStudent } from "@/lib/orders";

export type MembershipPlan = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price_vnd: number;
  compare_price_vnd: number | null;
  duration_days: number;
  perks: string[];
  course_scope: "all" | "selected";
  course_ids: string[];
  tools_access: boolean;
  ai_daily_quota: number;
  gr_campaign_id: string | null;
  is_published: boolean;
  is_featured: boolean;
  position: number;
};

export const PLAN_COLUMNS =
  "id, slug, name, tagline, description, price_vnd, compare_price_vnd, duration_days, perks, course_scope, course_ids, tools_access, ai_daily_quota, gr_campaign_id, is_published, is_featured, position";

export async function listPublishedPlans() {
  // Lúc build (dựng sẵn trang /thanh-vien) mà chưa có khóa service -> trả rỗng, trang tự làm mới sau
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const { data } = await createAdminSupabase()
    .from("membership_plans")
    .select(PLAN_COLUMNS)
    .eq("is_published", true)
    .order("position");
  return (data ?? []) as MembershipPlan[];
}

export async function getPlanBySlug(slug: string, onlyPublished = true) {
  let q = createAdminSupabase().from("membership_plans").select(PLAN_COLUMNS).eq("slug", slug);
  if (onlyPublished) q = q.eq("is_published", true);
  const { data } = await q.maybeSingle();
  return (data as MembershipPlan | null) ?? null;
}

/** Gói thành viên còn hạn (lấy gói hết hạn muộn nhất) */
export async function getActiveMembership(userId: string) {
  const { data } = await createAdminSupabase()
    .from("memberships")
    .select(`id, starts_at, expires_at, plan:membership_plans(${PLAN_COLUMNS})`)
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return data as unknown as { id: string; starts_at: string; expires_at: string; plan: MembershipPlan };
}

/** Khóa học thuộc gói: tất cả khóa đang mở bán, hoặc danh sách chọn */
async function planCourseIds(plan: MembershipPlan) {
  if (plan.course_scope === "selected") return plan.course_ids;
  const { data } = await createAdminSupabase().from("courses").select("id").eq("is_published", true);
  return (data ?? []).map((c) => c.id as string);
}

/** Mở/gia hạn quyền học các khóa của gói tới ngày hết hạn gói (không rút ngắn hạn đang có) */
export async function syncMembershipCourses(userId: string, plan: MembershipPlan, expiresAt: string) {
  const db = createAdminSupabase();
  const ids = await planCourseIds(plan);
  if (!ids.length) return 0;
  const { data: existing } = await db.from("enrollments").select("id, course_id, status, expires_at").eq("user_id", userId).in("course_id", ids);
  const byCourse = new Map((existing ?? []).map((e) => [e.course_id, e]));
  let changed = 0;
  for (const cid of ids) {
    const e = byCourse.get(cid);
    if (!e) {
      await db.from("enrollments").insert({ user_id: userId, course_id: cid, status: "active", expires_at: expiresAt, source: "member" });
      changed++;
    } else if (e.status !== "active" || !e.expires_at || e.expires_at < expiresAt) {
      // status khác active = admin đã khóa tay -> tôn trọng, không tự mở lại
      if (e.status !== "active") continue;
      await db.from("enrollments").update({ expires_at: expiresAt, source: "member" }).eq("id", e.id);
      changed++;
    }
  }
  return changed;
}

/**
 * Kích hoạt / gia hạn gói thành viên cho 1 email.
 * Gia hạn nối tiếp gói đang còn, nhưng tối đa 12 tháng tính từ hôm nay (quy định mọi khóa ≤ 12 tháng).
 */
export async function grantMembership(opts: {
  email: string;
  name?: string | null;
  phone?: string | null;
  plan: MembershipPlan;
  source: "order" | "admin" | "api";
  orderId?: string | null;
}) {
  const db = createAdminSupabase();
  const userId = await ensureStudent(opts.email, opts.name, opts.phone);
  const now = Date.now();
  const current = await getActiveMembership(userId);
  const start = current ? Math.max(now, new Date(current.expires_at).getTime()) : now;
  const cap = now + MAX_ACCESS_DAYS * 86_400_000;
  const expiresAt = new Date(Math.min(start + opts.plan.duration_days * 86_400_000, cap)).toISOString();

  const { data: membership, error } = await db
    .from("memberships")
    .insert({ user_id: userId, plan_id: opts.plan.id, status: "active", expires_at: expiresAt, source: opts.source, order_id: opts.orderId ?? null })
    .select("id")
    .single();
  if (error) throw error;

  await syncMembershipCourses(userId, opts.plan, expiresAt);

  await addToGetResponse({ email: opts.email, name: opts.name, campaignId: opts.plan.gr_campaign_id }).catch((err) =>
    console.error("GetResponse", err),
  );
  await enqueueAutomation("membership_started", {
    email: opts.email,
    userId,
    dedupeKey: `member:${membership.id}`,
    context: {
      ten: opts.name ?? undefined,
      goi_thanh_vien: opts.plan.name,
      ngay_het_han: new Date(expiresAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    },
  });
  return { userId, membershipId: membership.id as string, expiresAt };
}

/** Cron: thành viên còn hạn được tự mở các khóa MỚI ra mắt (gói "tất cả khóa") */
export async function syncAllMembers() {
  const db = createAdminSupabase();
  const { data } = await db
    .from("memberships")
    .select(`user_id, expires_at, plan:membership_plans(${PLAN_COLUMNS})`)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());
  let changed = 0;
  for (const m of (data ?? []) as unknown as { user_id: string; expires_at: string; plan: MembershipPlan }[]) {
    changed += await syncMembershipCourses(m.user_id, m.plan, m.expires_at);
  }
  return { members: data?.length ?? 0, changed };
}
