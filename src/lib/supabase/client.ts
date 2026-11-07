import { createBrowserClient } from "@supabase/ssr";
import { supabaseUrl, supabaseAnonKey } from "./env";
import { cookieDomainFor } from "@/lib/site";

/** Client dùng trong Client Component (đăng nhập, đánh dấu hoàn thành bài...) */
export function createBrowserSupabase() {
  const domain = typeof window === "undefined" ? undefined : cookieDomainFor(window.location.hostname);
  return createBrowserClient(supabaseUrl(), supabaseAnonKey(), domain ? { cookieOptions: { domain } } : undefined);
}
