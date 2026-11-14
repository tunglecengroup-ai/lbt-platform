import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runAutomation, scanTimeTriggers } from "@/lib/automation";
import { syncAllMembers } from "@/lib/membership";
import { announceDuePosts } from "@/lib/blog-publish";

/**
 * Cron chạy mỗi 5 phút (netlify/functions/automation-cron.mts gọi vào đây).
 * Header: Authorization: Bearer <CRON_SECRET>
 * - Mỗi lần: đưa bài blog hẹn giờ lên sóng (làm mới trang + IndexNow + Telegram), gửi các bước email đến hạn
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
  const hourly = minute < 5 || new URL(req.url).searchParams.has("full");
  const blog = await announceDuePosts();
  const scan = hourly ? await scanTimeTriggers() : null;
  const members = hourly ? await syncAllMembers() : null;
  const sent = await runAutomation();
  return NextResponse.json({ ok: true, blog, scan, members, sent });
}
