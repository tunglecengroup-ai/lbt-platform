"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { newApiKey } from "@/lib/api-auth";

export type KeyState = { key?: string; name?: string; error?: string };

/** Tạo API key — khóa gốc chỉ trả về đúng 1 lần ở đây */
export async function createApiKey(_prev: KeyState, form: FormData): Promise<KeyState> {
  await assertAdmin();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Đặt tên cho khóa (vd: Pancake POS, n8n)" };
  const k = newApiKey();
  const { error } = await createAdminSupabase().from("api_keys").insert({ name, key_prefix: k.prefix, key_hash: k.hash });
  if (error) return { error: error.message };
  revalidatePath("/admin/api");
  return { key: k.key, name };
}

export async function revokeApiKey(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", String(form.get("id")));
  revalidatePath("/admin/api");
}
