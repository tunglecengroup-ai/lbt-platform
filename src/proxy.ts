import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { refreshStudentSession } from "@/lib/supabase/proxy";

/**
 * Cổng bảo vệ — 3 khu:
 *  • Công khai     (/, /khoa-hoc, /don-hang, /api/webhooks…) -> ai cũng vào được
 *  • Khu HỌC VIÊN  (/hoc/*)   -> cần phiên Supabase Auth (đăng nhập bằng mã email ở /hoc/dang-nhap)
 *  • Khu ADMIN     (/admin/*) -> cần cookie "lbt_session" khớp APP_SESSION_SECRET (đăng nhập ở /admin/login)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ----- Khu admin -----
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login") return NextResponse.next();
    const secret = process.env.APP_SESSION_SECRET;
    const session = request.cookies.get("lbt_session")?.value;
    if (!secret || session === secret) return NextResponse.next();
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Webhook ngân hàng không mang cookie -> khỏi làm mới phiên
  if (pathname.startsWith("/api/webhooks/")) return NextResponse.next();

  const { response, user } = await refreshStudentSession(request);

  // ----- Khu học viên -----
  if ((pathname === "/hoc" || pathname.startsWith("/hoc/")) && pathname !== "/hoc/dang-nhap") {
    if (!user) {
      const url = new URL("/hoc/dang-nhap", request.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
