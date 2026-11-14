"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { LINK_CHANNELS } from "@/lib/channels";
import { siteUrl } from "@/lib/site";
import { slugify } from "@/lib/utils";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export type LinkState = { url?: string; error?: string };

/** Tạo link có gắn mã theo dõi cho 1 kênh + lưu lại để xem số liệu */
export async function createTrackingLink(_prev: LinkState, form: FormData): Promise<LinkState> {
  await assertAdmin();
  const ch = LINK_CHANNELS.find((c) => c.channel === str(form, "channel"));
  if (!ch) return { error: "Chọn kênh" };
  const custom = str(form, "custom");
  const path = custom || str(form, "target") || "/";
  let target: URL;
  try {
    target = new URL(path, siteUrl);
  } catch {
    return { error: "Đường dẫn trang đích không hợp lệ" };
  }
  const campaign = slugify(str(form, "campaign"));
  if (!campaign) return { error: "Đặt tên chiến dịch (vd: ra-mat-khoa-ai-t11)" };
  const content = slugify(str(form, "content")) || null;

  target.searchParams.set("utm_source", ch.source);
  target.searchParams.set("utm_medium", ch.medium);
  target.searchParams.set("utm_campaign", campaign);
  if (content) target.searchParams.set("utm_content", content);
  const full = target.toString();

  const { error } = await createAdminSupabase().from("tracking_links").insert({
    name: str(form, "name") || null,
    channel: ch.channel,
    utm_source: ch.source,
    utm_medium: ch.medium,
    utm_campaign: campaign,
    utm_content: content,
    target_url: path,
    full_url: full,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/nguon-khach");
  return { url: full };
}

export async function deleteTrackingLink(form: FormData) {
  await assertAdmin();
  await createAdminSupabase().from("tracking_links").delete().eq("id", str(form, "id"));
  revalidatePath("/admin/nguon-khach");
}
