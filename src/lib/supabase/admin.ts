import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseServiceKey } from "./env";

/**
 * Client quyền cao (service role) — BỎ QUA toàn bộ RLS.
 * CHỈ dùng phía server, trong KHU ADMIN (đã nằm sau cổng mật khẩu).
 * TUYỆT ĐỐI không import vào Client Component.
 */
export function createAdminSupabase() {
  return createClient(supabaseUrl(), supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
