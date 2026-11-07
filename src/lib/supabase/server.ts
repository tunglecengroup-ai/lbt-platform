import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cookieDomainFor } from "@/lib/site";
import { supabaseUrl, supabaseAnonKey } from "./env";

/**
 * Client dùng trong Server Component / Route Handler cho KHU HỌC VIÊN.
 * Chạy dưới danh nghĩa học viên đang đăng nhập -> RLS tự chặn,
 * mỗi người chỉ đọc được dữ liệu của chính mình.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  const domain = cookieDomainFor((await headers()).get("host"));

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookieOptions: domain ? { domain } : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Gọi từ Server Component -> không set được cookie, bỏ qua.
          // Phiên đăng nhập vẫn được làm mới ở proxy/route handler.
        }
      },
    },
  });
}
