import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/admin/login", request.url));
  res.cookies.set("lbt_session", "", { path: "/", maxAge: 0 });
  return res;
}
