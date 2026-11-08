import { NextResponse } from "next/server";
import { apiError, authenticate, list, logRequest, readBody } from "@/lib/api-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * POST /api/v1/students/revoke — thu hồi quyền học (vd hoàn tiền bên hệ thống ngoài).
 * Body: email*, courses (slug/id, bỏ trống = tất cả khóa), plan ("all" = hủy cả gói thành viên)
 */
export async function POST(req: Request) {
  const key = await authenticate(req);
  if (!key) return apiError(401, "unauthorized", "Thiếu hoặc sai API key");
  const body = await readBody(req);
  const email = String(body.email ?? "").trim().toLowerCase();
  const refs = list(body.courses ?? body.course);
  const db = createAdminSupabase();
  const { data: p } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!p) return apiError(404, "not_found", "Không có học viên với email này");

  let q = db.from("enrollments").update({ status: "refunded" }).eq("user_id", p.id).eq("status", "active");
  if (refs.length) {
    const { data: cs } = await db.from("courses").select("id, slug").or(refs.map((r) => `slug.eq.${r.replace(/[^\w-]/g, "")}`).join(","));
    const ids = (cs ?? []).map((c) => c.id).concat(refs.filter((r) => /^[0-9a-f-]{36}$/i.test(r)));
    if (!ids.length) return apiError(404, "not_found", "Không tìm thấy khóa");
    q = q.in("course_id", ids);
  }
  const { data: changed } = await q.select("course_id");
  if (body.plan === "all") await db.from("memberships").update({ status: "cancelled" }).eq("user_id", p.id).eq("status", "active");
  const result = { ok: true, revoked: changed?.length ?? 0 };
  await logRequest({ keyId: key.id, endpoint: "POST /api/v1/students/revoke", status: 200, request: { email, courses: refs, plan: body.plan ?? null }, response: result });
  return NextResponse.json(result);
}
