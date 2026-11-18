import { NextResponse } from "next/server";
import { apiError, authenticate, readBody } from "@/lib/api-auth";
import { claimZalo, reportZalo } from "@/lib/zalo";

/**
 * Hàng chờ tin Zalo cá nhân — tiện ích Chrome "Zalo CSKH" gọi (API key ở Admin → API kết nối).
 *  GET  /api/v1/zalo/outbox?limit=1   lấy tin cần gửi (giữ chỗ 30 phút)
 *  POST /api/v1/zalo/outbox           báo kết quả {id, status: sent|failed|not_found|retry, error?}
 */
export async function GET(req: Request) {
  if (!(await authenticate(req))) return apiError(401, "unauthorized", "Thiếu hoặc sai API key");
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 1) || 1;
  return NextResponse.json({ ok: true, items: await claimZalo(limit) });
}

export async function POST(req: Request) {
  if (!(await authenticate(req))) return apiError(401, "unauthorized", "Thiếu hoặc sai API key");
  const body = await readBody(req);
  const id = String(body.id ?? "");
  const status = String(body.status ?? "") as "sent" | "failed" | "not_found" | "retry";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["sent", "failed", "not_found", "retry"].includes(status)) {
    return apiError(422, "invalid", "Cần id + status (sent|failed|not_found|retry)");
  }
  const ok = await reportZalo(id, { status, error: String(body.error ?? "").slice(0, 300) || undefined });
  return ok ? NextResponse.json({ ok: true }) : apiError(404, "not_found", "Không thấy tin");
}
