import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Cổng bảo vệ toàn bộ ứng dụng bằng 1 mật khẩu dùng chung (back-office).
 * - Chưa đăng nhập -> đá về /login.
 * - Cookie hợp lệ khi giá trị khớp APP_SESSION_SECRET (đặt trong biến môi trường).
 * Khi nối auth thật (Supabase) sau này thì thay logic ở đây.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cho qua trang đăng nhập và 2 API auth
  if (
    pathname === "/login" ||
    pathname === "/api/login" ||
    pathname === "/api/logout"
  ) {
    return NextResponse.next();
  }

  const secret = process.env.APP_SESSION_SECRET;
  const session = request.cookies.get("lbt_session")?.value;

  // Nếu chưa cấu hình secret thì coi như mở khóa (tránh tự khóa mình khi quên set)
  if (!secret || session === secret) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Chạy cho mọi route trừ static/asset
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
