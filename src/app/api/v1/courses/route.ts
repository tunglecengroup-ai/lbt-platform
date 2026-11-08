import { NextResponse } from "next/server";
import { apiError, authenticate } from "@/lib/api-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

/** GET /api/v1/courses — danh sách khóa + gói thành viên để hệ thống ngoài map mã sản phẩm */
export async function GET(req: Request) {
  if (!(await authenticate(req))) return apiError(401, "unauthorized", "Thiếu hoặc sai API key");
  const db = createAdminSupabase();
  const [{ data: courses }, { data: plans }] = await Promise.all([
    db.from("courses").select("id, slug, title, price_vnd, access_days, is_published").order("position"),
    db.from("membership_plans").select("id, slug, name, price_vnd, duration_days, is_published").order("position"),
  ]);
  return NextResponse.json({ ok: true, courses: courses ?? [], plans: plans ?? [] });
}
