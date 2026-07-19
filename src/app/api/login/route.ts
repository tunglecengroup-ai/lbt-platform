import { NextResponse } from "next/server";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const secret = process.env.APP_SESSION_SECRET;
  const expected = process.env.APP_PASSWORD;

  let password = "";
  try {
    const body = await request.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  if (!expected || !secret) {
    return NextResponse.json(
      { ok: false, error: "Server chưa cấu hình mật khẩu" },
      { status: 500 },
    );
  }

  if (password !== expected) {
    return NextResponse.json({ ok: false, error: "Mật khẩu không đúng" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("lbt_session", secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
  return res;
}
