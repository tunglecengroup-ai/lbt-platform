import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { refreshStudentSession } from "@/lib/supabase/proxy";
import { learnHost, learnUrl, marketingHost, marketingUrl, splitDomains } from "@/lib/site";

/** Trang thuộc tên miền học (hoc.lebatung.com) */
const isLearnPath = (p: string) =>
  p === "/hoc" || p.startsWith("/hoc/") || p === "/admin" || p.startsWith("/admin/") || p.startsWith("/auth/");
/** Trang quảng bá (lebatung.com) — vào nhầm tên miền học thì chuyển về */
const isMarketingPath = (p: string) =>
  p.startsWith("/khoa-hoc") || p.startsWith("/blog") || p.startsWith("/p/") || p.startsWith("/don-hang") || p.startsWith("/thanh-vien") || p.startsWith("/chung-nhan");

/** Tách 2 tên miền: mỗi trang chỉ sống ở 1 nơi, vào nhầm thì chuyển (giữ nguyên đường dẫn + query) */
export function routeByHost(request: NextRequest) {
  if (!splitDomains) return null;
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  const { pathname, search } = request.nextUrl;
  const go = (base: string, path = pathname) => NextResponse.redirect(base + path + search, 308);

  if (host === "www." + marketingHost) return go(marketingUrl);
  if (host === marketingHost && isLearnPath(pathname)) return go(learnUrl);
  if (host === learnHost) {
    if (pathname === "/") return NextResponse.redirect(learnUrl + "/hoc", 307);
    if (isMarketingPath(pathname)) return go(marketingUrl);
  }
  return null;
}

/**
 * Cổng bảo vệ — 3 khu:
 *  • Công khai     (/, /khoa-hoc, /don-hang, /api/webhooks…) -> ai cũng vào được
 *  • Khu HỌC VIÊN  (/hoc/*)   -> cần phiên Supabase Auth (đăng nhập bằng mã email ở /hoc/dang-nhap, đăng ký ở /hoc/dang-ky)
 *  • Khu ADMIN     (/admin/*) -> cần cookie "lbt_session" khớp APP_SESSION_SECRET (đăng nhập ở /admin/login)
 * Khi bật tách tên miền (src/lib/site.ts): quảng bá ở lebatung.com, học + admin ở hoc.lebatung.com.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const moved = routeByHost(request);
  if (moved) return moved;

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
  if ((pathname === "/hoc" || pathname.startsWith("/hoc/")) && pathname !== "/hoc/dang-nhap" && pathname !== "/hoc/dang-ky") {
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
