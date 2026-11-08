import { NextResponse } from "next/server";
import { apiError, authenticate, findReplay, list, logRequest, readBody } from "@/lib/api-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureStudent, grantCourse } from "@/lib/orders";
import { getPlanBySlug, grantMembership } from "@/lib/membership";
import { learnHref } from "@/lib/site";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ENDPOINT = "POST /api/v1/students";

/**
 * POST /api/v1/students — tạo tài khoản (nếu chưa có) + mở khóa học / gói thành viên.
 * Body (JSON hoặc form):
 *   email*        email học viên (dùng để đăng nhập)
 *   name, phone   tuỳ chọn
 *   courses       mã khóa (slug) hoặc id — chuỗi "a,b" hoặc mảng
 *   plan          slug gói thành viên (vd member-12-thang)
 *   days          số ngày học cho lần cấp này (tối đa 365) — mặc định theo cài đặt khóa
 *   external_id   mã đơn bên hệ thống của bạn — gửi lại cùng mã sẽ KHÔNG cấp trùng
 */
export async function POST(req: Request) {
  const key = await authenticate(req);
  if (!key) return apiError(401, "unauthorized", "Thiếu hoặc sai API key (header Authorization: Bearer <key>)");

  const body = await readBody(req);
  if (body.__invalid) return apiError(400, "invalid_body", "Body không phải JSON/form hợp lệ");
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? body.full_name ?? "").trim() || null;
  const phone = String(body.phone ?? "").replace(/[^\d+]/g, "") || null;
  const externalId = String(body.external_id ?? body.order_id ?? "").trim() || null;
  const courseRefs = list(body.courses ?? body.course);
  const planSlug = String(body.plan ?? "").trim() || null;
  const days = Number(body.days) || null;
  const logged = { email, name, phone, courses: courseRefs, plan: planSlug, days, external_id: externalId };

  if (!EMAIL_RE.test(email)) {
    await logRequest({ keyId: key.id, endpoint: ENDPOINT, externalId, status: 422, request: logged });
    return apiError(422, "invalid_email", "Email không hợp lệ");
  }
  if (externalId) {
    const replay = await findReplay(key.id, ENDPOINT, externalId);
    if (replay) return NextResponse.json(replay, { headers: { "Idempotent-Replay": "true" } });
  }

  const db = createAdminSupabase();
  // Tìm khóa theo slug hoặc id
  const { data: allCourses } = await db.from("courses").select("id, slug, title, access_days, gr_campaign_id");
  const found = courseRefs.map((ref) => (allCourses ?? []).find((c) => c.slug === ref || c.id === ref));
  const missing = courseRefs.filter((_, i) => !found[i]);
  const plan = planSlug ? await getPlanBySlug(planSlug, false) : null;
  if (missing.length || (planSlug && !plan)) {
    const err = { ok: false, error: { code: "not_found", message: "Không tìm thấy khóa học/gói", courses: missing, plan: planSlug && !plan ? planSlug : undefined } };
    await logRequest({ keyId: key.id, endpoint: ENDPOINT, externalId, status: 404, request: logged, response: err });
    return NextResponse.json(err, { status: 404 });
  }

  try {
    const { data: before } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
    const userId = await ensureStudent(email, name, phone);
    const enrollments = [];
    for (const c of found) {
      await grantCourse({ email, name, phone, course: c!, days });
      const { data: e } = await db.from("enrollments").select("expires_at").eq("user_id", userId).eq("course_id", c!.id).single();
      enrollments.push({ course: c!.slug, title: c!.title, expires_at: e?.expires_at ?? null });
    }
    let membership = null;
    if (plan) {
      const m = await grantMembership({ email, name, phone, plan, source: "api" });
      membership = { plan: plan.slug, name: plan.name, expires_at: m.expiresAt };
    }
    const result = {
      ok: true,
      student: { id: userId, email, created: !before },
      enrollments,
      membership,
      login_url: learnHref("/hoc/dang-nhap") ,
    };
    await logRequest({ keyId: key.id, endpoint: ENDPOINT, externalId, status: 200, request: logged, response: result });
    return NextResponse.json(result);
  } catch (e) {
    const err = { ok: false, error: { code: "server_error", message: (e as Error).message } };
    await logRequest({ keyId: key.id, endpoint: ENDPOINT, externalId, status: 500, request: logged, response: err });
    return NextResponse.json(err, { status: 500 });
  }
}

/** GET /api/v1/students?email=… — tra cứu quyền học hiện tại của 1 email */
export async function GET(req: Request) {
  const key = await authenticate(req);
  if (!key) return apiError(401, "unauthorized", "Thiếu hoặc sai API key");
  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return apiError(422, "invalid_email", "Thiếu ?email=");
  const db = createAdminSupabase();
  const { data: p } = await db.from("profiles").select("id, email, full_name, phone, created_at").eq("email", email).maybeSingle();
  if (!p) return NextResponse.json({ ok: true, student: null });
  const [{ data: enr }, { data: mem }] = await Promise.all([
    db.from("enrollments").select("status, expires_at, courses(slug, title)").eq("user_id", p.id),
    db.from("memberships").select("status, expires_at, membership_plans(slug, name)").eq("user_id", p.id),
  ]);
  return NextResponse.json({ ok: true, student: p, enrollments: enr ?? [], memberships: mem ?? [] });
}
