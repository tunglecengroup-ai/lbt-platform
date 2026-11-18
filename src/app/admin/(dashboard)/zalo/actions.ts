"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { znsAccessToken } from "@/lib/zalo";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Dán refresh token của Zalo OA (lấy ở developers.zalo.me → API Explorer / OAuth). Lưu xong thử đổi luôn để kiểm tra. */
export async function saveRefreshToken(form: FormData) {
  await assertAdmin();
  const token = str(form, "refresh_token");
  if (!token) return;
  await createAdminSupabase()
    .from("zalo_oa_tokens")
    .upsert({ id: 1, refresh_token: token, access_token: null, expires_at: null, updated_at: new Date().toISOString() });
  await znsAccessToken();
  revalidatePath("/admin/zalo");
}

export async function cancelOutbox(form: FormData) {
  await assertAdmin();
  const db = createAdminSupabase();
  const id = str(form, "id");
  const { data } = await db.from("zalo_outbox").update({ status: "cancelled" }).eq("id", id).in("status", ["pending", "sending"]).select("message_id").maybeSingle();
  if (data?.message_id) await db.from("automation_messages").update({ status: "skipped", error: "Anh hủy tin" }).eq("id", data.message_id);
  revalidatePath("/admin/zalo");
}

export async function retryOutbox(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("zalo_outbox").update({ status: "pending", attempts: 0, error: null }).eq("id", str(form, "id")).eq("status", "failed");
  revalidatePath("/admin/zalo");
}
