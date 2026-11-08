import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runAutomation, scanTimeTriggers } from "@/lib/automation";
import { syncAllMembers } from "@/lib/membership";

/**
 * Cron chạy mỗi 15 phút (netlify/functions/automation-cron.mts gọi vào đây).
 * Header: Authorization: Bearer <CRON_SECRET>
 * - Mỗi lần: gửi các bước email đến hạn
 * - Lần chạy đầu mỗi giờ: quét sự kiện theo thời gian + mở khóa mới cho thành viên
 */
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const want = Buffer.from(secret);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const minute = new Date().getUTCMinutes();
  const hourly = minute < 15 || new URL(req.url).searchParams.has("full");
  const scan = hourly ? await scanTimeTriggers() : null;
  const members = hourly ? await syncAllMembers() : null;
  const sent = await runAutomation();
  return NextResponse.json({ ok: true, scan, members, sent });
}
