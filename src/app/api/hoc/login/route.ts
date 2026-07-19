import { NextResponse } from "next/server";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

/**
 * Đăng nhập học viên — BẢN DEMO: chấp nhận mọi email (chưa nối Supabase Auth).
 * Khi nối thật: xác thực qua Supabase Auth (email/mật khẩu hoặc Google),
 * cookie phiên do Supabase cấp thay cho cookie mock này.
 */
export async function POST(request: Request) {
  let email = "";
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email.trim() : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ ok: false, error: "Vui lòng nhập email" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("student_session", email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
  return res;
}
