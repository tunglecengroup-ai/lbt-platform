"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { grantMembership, PLAN_COLUMNS, type MembershipPlan } from "@/lib/membership";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => {
  const n = parseInt(str(f, k).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

function refresh() {
  revalidatePath("/admin/membership");
  revalidatePath("/admin/students", "layout");
  revalidatePath("/thanh-vien", "layout"); // gồm cả trang mua gói (đang lưu sẵn)
}

export async function savePlan(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return;
  const row = {
    name,
    slug: slugify(str(form, "slug") || name),
    tagline: str(form, "tagline") || null,
    description: str(form, "description") || null,
    price_vnd: int(form, "price") ?? 0,
    compare_price_vnd: int(form, "compare_price"),
    duration_days: Math.min(Math.max(int(form, "duration_days") ?? 365, 1), 365),
    perks: str(form, "perks").split("\n").map((s) => s.trim()).filter(Boolean),
    course_scope: form.get("course_scope") === "selected" ? "selected" : "all",
    course_ids: form.getAll("course_ids").map(String),
    tools_access: form.get("tools_access") === "on",
    ai_daily_quota: Math.min(int(form, "ai_daily_quota") ?? 30, 500),
    gr_campaign_id: str(form, "gr_campaign_id") || null,
    is_published: form.get("is_published") === "on",
    is_featured: form.get("is_featured") === "on",
    position: int(form, "position") ?? 0,
  };
  const db = createAdminSupabase();
  const { error } = id
    ? await db.from("membership_plans").update(row).eq("id", id)
    : await db.from("membership_plans").insert(row);
  if (error) throw new Error(error.code === "23505" ? "Đường dẫn (slug) đã tồn tại" : error.message);
  refresh();
}

export async function cancelMembership(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("memberships").update({ status: "cancelled" }).eq("id", str(form, "id"));
  refresh();
}

export type GrantState = { message?: string; error?: string };

/** Kích hoạt gói cho 1 học viên (từ trang chi tiết học viên) */
export async function grantPlanToStudent(_prev: GrantState, form: FormData): Promise<GrantState> {
  await assertAdmin();
  const db = createAdminSupabase();
  const { data: profile } = await db.from("profiles").select("email, full_name").eq("id", str(form, "user_id")).single();
  if (!profile) return { error: "Không tìm thấy học viên" };
  const { data: plan } = await db.from("membership_plans").select(PLAN_COLUMNS).eq("id", str(form, "plan_id")).maybeSingle();
  if (!plan) return { error: "Chưa chọn gói" };
  try {
    const r = await grantMembership({ email: profile.email, plan: plan as MembershipPlan, source: "admin" });
    refresh();
    return { message: `Đã kích hoạt ${(plan as MembershipPlan).name} tới ${new Date(r.expiresAt).toLocaleDateString("vi-VN")}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

