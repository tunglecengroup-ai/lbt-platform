import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { runAutomation, scanTimeTriggers } from "@/lib/automation";
import { syncAllMembers } from "@/lib/membership";
import { announceDuePosts } from "@/lib/blog-publish";
import { runSocial } from "@/lib/social";

/**
 * Cron chạy mỗi 5 phút (netlify/functions/automation-cron.mts gọi vào đây).
 * Header: Authorization: Bearer <CRON_SECRET>
 * - Mỗi lần: đăng bài đa kênh tới giờ (+ bình luận link fanpage), đưa bài blog hẹn giờ lên sóng (làm mới trang + IndexNow + Telegram), gửi các bước email đến hạn
 * - Lần chạy đầu mỗi giờ: quét sự kiện theo thời gian + mở khóa mới cho thành viên
 */
/** Mã cron: CRON_SECRET nếu có, không thì tự suy ra từ APP_SESSION_SECRET (khỏi phải thêm biến trên Netlify) */
function cronSecret() {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;
  const base = process.env.APP_SESSION_SECRET;
  return base ? createHmac("sha256", base).update("lbt-cron").digest("hex") : "";
}

function authorized(req: Request) {
  const secret = cronSecret();
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
  const social = await runSocial().catch((e) => ({ error: (e as Error).message }));
  const scan = hourly ? await scanTimeTriggers() : null;
  const members = hourly ? await syncAllMembers() : null;
  const sent = await runAutomation();
  return NextResponse.json({ ok: true, blog, social, scan, members, sent });
}
