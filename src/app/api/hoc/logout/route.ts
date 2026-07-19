import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/hoc/dang-nhap", request.url));
  res.cookies.set("student_session", "", { path: "/", maxAge: 0 });
  return res;
}
