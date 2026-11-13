import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";
import { USER_EMAIL_HEADER, USER_ID_HEADER } from "@/lib/supabase/proxy";

/**
 * Học viên đang đăng nhập (đã xác minh).
 * Proxy đã gọi Supabase Auth và chuyển kết quả xuống qua header nội bộ -> trang khỏi gọi lại (đỡ 1 lượt chờ Mỹ↔Singapore).
 * Không có header (đường dẫn proxy không kiểm tra) thì mới tự gọi Supabase Auth.
 */
export const getVerifiedUser = cache(async (): Promise<{ id: string; email: string } | null> => {
  const h = await headers();
  const id = h.get(USER_ID_HEADER);
  if (id) return { id, email: decodeURIComponent(h.get(USER_EMAIL_HEADER) ?? "") };
  // Không có cookie phiên -> chắc chắn chưa đăng nhập, khỏi gọi mạng
  if (!(await cookies()).getAll().some((c) => c.name.startsWith("sb-"))) return null;
  const { data } = await (await createServerSupabase()).auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
});
