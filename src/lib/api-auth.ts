import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * API cho hệ thống bên ngoài (Pancake, Haravan, Webcake, n8n, CRM…) tạo tài khoản + mở khóa tự động.
 * Xác thực: header `Authorization: Bearer <khóa>` hoặc `X-API-Key: <khóa>`.
 * Khóa chỉ hiện 1 lần lúc tạo; DB chỉ lưu sha256.
 */
export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

export function newApiKey() {
  const key = `lbt_live_${randomBytes(24).toString("base64url")}`;
  return { key, prefix: key.slice(0, 13), hash: hashKey(key) };
}

export type ApiKeyRow = { id: string; name: string };

export async function authenticate(req: Request): Promise<ApiKeyRow | null> {
  const auth = req.headers.get("authorization") ?? "";
  const key = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : (req.headers.get("x-api-key") ?? "").trim();
  if (!key.startsWith("lbt_")) return null;
  const db = createAdminSupabase();
  const { data } = await db.from("api_keys").select("id, name").eq("key_hash", hashKey(key)).is("revoked_at", null).maybeSingle();
  if (!data) return null;
  await db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return data;
}

/** Đọc body JSON hoặc form (một số hệ thống chỉ gửi được form) */
export async function readBody(req: Request): Promise<Record<string, unknown>> {
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) return ((await req.json()) ?? {}) as Record<string, unknown>;
    if (type.includes("form")) {
      const f = await req.formData();
      const out: Record<string, unknown> = {};
      for (const [k, v] of f.entries()) {
        const val = String(v);
        out[k] = k in out ? ([] as unknown[]).concat(out[k], val) : val;
      }
      return out;
    }
    const text = await req.text();
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return { __invalid: true };
  }
}

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

/** Ghi log mọi lần gọi (bỏ trường nhạy cảm) */
export async function logRequest(input: {
  keyId: string | null;
  endpoint: string;
  externalId?: string | null;
  status: number;
  request?: unknown;
  response?: unknown;
}) {
  try {
    await createAdminSupabase().from("api_requests").insert({
      key_id: input.keyId,
      endpoint: input.endpoint,
      external_id: input.externalId || null,
      status_code: input.status,
      request: input.request ?? null,
      response: input.response ?? null,
    });
  } catch (e) {
    console.error("api log", e);
  }
}

/** Đã xử lý thành công mã đơn này rồi -> trả lại đúng kết quả cũ (chống tạo trùng khi hệ thống ngoài gửi lại) */
export async function findReplay(keyId: string, endpoint: string, externalId: string) {
  const { data } = await createAdminSupabase()
    .from("api_requests")
    .select("response")
    .eq("key_id", keyId)
    .eq("endpoint", endpoint)
    .eq("external_id", externalId)
    .lt("status_code", 300)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.response ?? null;
}

/** Danh sách chuỗi từ "a,b" | ["a","b"] */
export function list(v: unknown): string[] {
  if (Array.isArray(v)) return v.flatMap((x) => list(x));
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}
