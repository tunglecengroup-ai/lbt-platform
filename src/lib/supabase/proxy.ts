import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomainFor } from "@/lib/site";

/** Header nội bộ: proxy đã xác minh phiên -> chuyển user id/email xuống trang, khỏi gọi Supabase Auth lần 2.
 *  Proxy LUÔN xóa header này từ trình duyệt gửi lên trước khi đặt lại (không giả mạo được). */
export const USER_ID_HEADER = "x-lbt-user-id";
export const USER_EMAIL_HEADER = "x-lbt-user-email";

export function stripUserHeaders(request: NextRequest) {
  request.headers.delete(USER_ID_HEADER);
  request.headers.delete(USER_EMAIL_HEADER);
}

/**
 * Làm mới phiên Supabase của học viên trong proxy và trả về user (nếu có).
 * Cookie phiên mới được ghi vào cả request (cho Server Component đọc) lẫn response.
 */
export async function refreshStudentSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { response, user: null };

  const domain = cookieDomainFor(request.headers.get("host"));
  const supabase = createServerClient(url, key, {
    cookieOptions: domain ? { domain } : undefined,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    request.headers.set(USER_ID_HEADER, user.id);
    request.headers.set(USER_EMAIL_HEADER, encodeURIComponent(user.email ?? ""));
    // Dựng lại response để header mới đi xuống trang, giữ nguyên cookie phiên vừa làm mới
    const next = NextResponse.next({ request });
    for (const c of response.cookies.getAll()) next.cookies.set(c);
    response = next;
  }

  // Chuyển sang cookie dùng chung ".lebatung.com": xóa bản cookie cũ chỉ-gắn-cho-1-tên-miền (nếu còn),
  // để trình duyệt không gửi 2 phiên trùng tên. Ghi thẳng header vì response.cookies gộp theo tên.
  if (domain) {
    for (const c of request.cookies.getAll()) {
      if (c.name.startsWith("sb-")) response.headers.append("Set-Cookie", `${c.name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`);
    }
  }

  return { response, user };
}
