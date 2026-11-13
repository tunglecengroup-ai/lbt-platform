import { NextResponse } from "next/server";
import { afterSignIn } from "@/app/hoc/actions";

/** Trình duyệt bắn ngầm (sendBeacon) ngay sau khi đăng nhập — không bắt học viên chờ */
export async function POST() {
  await afterSignIn();
  return NextResponse.json({ ok: true });
}
