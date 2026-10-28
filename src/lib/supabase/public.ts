import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseAnonKey } from "./env";

/**
 * Client anon KHÔNG gắn cookie — cho trang công khai (danh sách khóa, trang bán).
 * Chỉ đọc được những gì RLS cho phép người lạ xem (khóa đã publish).
 */
export function createPublicSupabase() {
  return createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
