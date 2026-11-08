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
/** Tên miền cũ (Edubit) — chuyển hẳn 301 về trang quảng bá, giữ nguyên đường dẫn (link khóa cũ đã map trong next.config.ts) */
const LEGACY_HOSTS = new Set(["lebatung.vn", "www.lebatung.vn"]);

export function routeByHost(request: NextRequest) {
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  const { pathname, search } = request.nextUrl;
  if (LEGACY_HOSTS.has(host)) {
    // Khu học/admin trên tên miền cũ -> thẳng sang hoc.lebatung.com, còn lại -> lebatung.com
    const target = splitDomains && isLearnPath(pathname) ? learnUrl : marketingUrl || "https://lebatung.com";
    return NextResponse.redirect(target + pathname + search, 301);
  }
  if (!splitDomains) return null;
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
/** Bài cũ trên lebatung.vn đã xóa hẳn -> 410 Gone để Google gỡ khỏi kết quả tìm kiếm nhanh (so khớp tiền tố vì slug dài) */
const GONE_PREFIXES = ["/blog/bac-si-nguyen-ngoc", "/blog/founder-do-hai-vuong"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const moved = routeByHost(request);
  if (moved) return moved;

  if (GONE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return new NextResponse(
      '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Bài viết đã gỡ</title><body style="font-family:sans-serif;text-align:center;padding:64px 16px"><h1>Bài viết này đã được gỡ</h1><p><a href="/blog">Xem các bài viết khác</a></p></body></html>',
      { status: 410, headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" } },
    );
  }

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
