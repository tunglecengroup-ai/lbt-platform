import { NextResponse } from "next/server";
import { apiError, authenticate, logRequest, readBody } from "@/lib/api-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { enqueueAutomation, paidAny } from "@/lib/automation";
import { normPhone } from "@/lib/zalo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ENDPOINT = "POST /api/v1/leads";
const s = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

/**
 * POST /api/v1/leads — nhận 1 lead đăng ký khóa (form ladi Webcake qua Sheet DATA KHÁCH HÀNG, n8n…)
 * rồi đưa vào chuỗi chăm sóc "Điền form ladi (chưa thanh toán)": email + Zalo, tự dừng khi khách trả tiền.
 * Body (JSON hoặc form):
 *   name, phone, email     cần ít nhất SĐT hoặc email
 *   course                 slug khóa trên web học (tuỳ chọn, để gắn đúng khóa)
 *   course_code, course_title, campaign, page_url, utm_source… (tuỳ chọn)
 * Cùng 1 khách + cùng 1 khóa chỉ vào chuỗi 1 lần.
 */
export async function POST(req: Request) {
  const key = await authenticate(req);
  if (!key) return apiError(401, "unauthorized", "Thiếu hoặc sai API key (header Authorization: Bearer <key>)");
  const body = await readBody(req);
  if (body.__invalid) return apiError(400, "invalid_body", "Body không phải JSON/form hợp lệ");

  const email = s(body.email).toLowerCase();
  const phone = normPhone(body.phone ?? body.sdt);
  const name = s(body.name ?? body.ho_ten ?? body.full_name, 120) || null;
  const logged = { name, phone, email, course: body.course, course_code: body.course_code, campaign: body.campaign };
  if (!phone && !EMAIL_RE.test(email)) {
    await logRequest({ keyId: key.id, endpoint: ENDPOINT, status: 422, request: logged });
    return apiError(422, "missing_contact", "Cần SĐT hợp lệ hoặc email");
  }

  const db = createAdminSupabase();
  const courseRef = s(body.course);
  const { data: course } = courseRef
    ? await db.from("courses").select("id, slug, title").eq("slug", courseRef).maybeSingle()
    : { data: null };
  const courseCode = s(body.course_code, 40).toUpperCase() || null;
  const courseTitle = course?.title || s(body.course_title, 200) || null;
  const utm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) if (body[k]) utm[k] = s(body[k], 200);

  const { data: lead } = await db
    .from("leads")
    .insert({
      name, phone, email: EMAIL_RE.test(email) ? email : null, campaign: s(body.campaign, 60) || null, course_code: courseCode,
      course_title: courseTitle, page_url: s(body.page_url ?? body.trang_nguon, 500) || null, utm, source: s(body.source, 30) || "webcake",
    })
    .select("id")
    .single();

  const paid = await paidAny(email, phone, new Date(Date.now() - 12 * 3600_000));
  if (!paid) {
    await enqueueAutomation("lead_registered", {
      email: EMAIL_RE.test(email) ? email : "",
      phone,
      dedupeKey: `lead:${course?.id ?? courseCode ?? "khac"}:${phone ?? email}`,
      context: { ten: name ?? undefined, khoa_hoc: courseTitle ?? undefined, course_id: course?.id, course_slug: course?.slug },
    });
  }
  const res = { ok: true, lead_id: lead?.id ?? null, queued: !paid, reason: paid ? "Khách đã thanh toán trước đó — không nhắc" : undefined };
  await logRequest({ keyId: key.id, endpoint: ENDPOINT, status: 200, request: logged, response: res });
  return NextResponse.json(res);
}
