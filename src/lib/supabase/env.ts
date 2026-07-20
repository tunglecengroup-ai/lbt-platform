/** Đọc biến môi trường Supabase, báo lỗi rõ ràng nếu thiếu */

export function supabaseUrl() {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!v) throw new Error("Thiếu biến môi trường NEXT_PUBLIC_SUPABASE_URL");
  return v;
}

export function supabaseAnonKey() {
  const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!v) throw new Error("Thiếu biến môi trường NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return v;
}

export function supabaseServiceKey() {
  const v = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!v) throw new Error("Thiếu biến môi trường SUPABASE_SERVICE_ROLE_KEY");
  return v;
}

/** Đã cấu hình Supabase chưa — dùng để tạm chạy dữ liệu mẫu khi chưa nối */
export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
