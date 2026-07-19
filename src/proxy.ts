import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Cổng bảo vệ KÉP — 2 khu tách biệt:
 *  • Khu HỌC VIÊN  (/hoc/*)  -> cần cookie "student_session" (đăng nhập ở /hoc/dang-nhap)
 *  • Khu ADMIN     (còn lại) -> cần cookie "lbt_session" khớp APP_SESSION_SECRET (đăng nhập ở /login)
 * Khi nối Supabase Auth thật cho học viên thì thay phần student ở đây.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Các endpoint auth và trang đăng nhập -> cho qua
  if (
    pathname.startsWith("/api/") ||
    pathname === "/login" ||
    pathname === "/hoc/dang-nhap"
  ) {
    return NextResponse.next();
  }

  // ----- Khu học viên -----
  if (pathname === "/hoc" || pathname.startsWith("/hoc/")) {
    const student = request.cookies.get("student_session")?.value;
    if (student) return NextResponse.next();
    const url = new URL("/hoc/dang-nhap", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // ----- Khu admin -----
  const secret = process.env.APP_SESSION_SECRET;
  const session = request.cookies.get("lbt_session")?.value;
  if (!secret || session === secret) {
    return NextResponse.next();
  }
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
