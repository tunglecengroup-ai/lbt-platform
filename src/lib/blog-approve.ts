import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseServiceKey } from "@/lib/supabase/env";

/**
 * Link duyệt bài blog gửi qua Telegram (công cụ D:\Git\blog-auto).
 * Chữ ký = HMAC-SHA256(SUPABASE_SERVICE_ROLE_KEY, "blog-approve:<post id>") dạng hex.
 * Script Python ký bằng cùng khóa nên không cần thêm biến môi trường mới.
 */
export function approveToken(postId: string) {
  return createHmac("sha256", supabaseServiceKey()).update(`blog-approve:${postId}`).digest("hex");
}

export function isValidApproveToken(postId: string, token: string | undefined | null) {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return false;
  const a = Buffer.from(approveToken(postId), "hex");
  const b = Buffer.from(token, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Dấu bài nháp còn thiếu số liệu thật — chưa được đăng khi còn dấu này */
export const MISSING_FACT_MARK = "[CẦN SỐ THẬT]";
