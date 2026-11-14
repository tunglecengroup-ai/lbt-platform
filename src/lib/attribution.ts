import "server-only";
import { cookies } from "next/headers";
import { CHANNELS, SOURCE_COOKIE, type Attribution, type Touch } from "@/lib/channels";

const clean = (t: unknown): Touch | undefined => {
  if (!t || typeof t !== "object") return undefined;
  const o = t as Record<string, unknown>;
  const str = (k: string, n = 200) => (typeof o[k] === "string" ? (o[k] as string).slice(0, n) : undefined);
  const channel = str("channel");
  if (!channel || !(channel in CHANNELS)) return undefined;
  return {
    channel: channel as Touch["channel"],
    source: str("source"), medium: str("medium"), campaign: str("campaign"), content: str("content"), term: str("term"),
    referrer: str("referrer", 300), landing: str("landing", 300), at: str("at", 40) ?? new Date().toISOString(),
  };
};

/** Nguồn khách từ cookie lbt_src (do SourceTracker ghi). Gọi trong server action / route handler. */
export async function readAttribution(): Promise<Attribution> {
  try {
    const raw = (await cookies()).get(SOURCE_COOKIE)?.value;
    if (!raw) return {};
    const json = JSON.parse(Buffer.from(decodeURIComponent(raw), "base64").toString("utf8")) as Attribution;
    return { f: clean(json.f), l: clean(json.l) };
  } catch {
    return {};
  }
}

/** Cột nguồn cho bảng orders */
export function orderSourceColumns(a: Attribution) {
  const l = a.l ?? a.f;
  return {
    channel: l?.channel ?? null,
    first_channel: a.f?.channel ?? null,
    referrer: l?.referrer ?? null,
    ...(l?.source ? { utm_source: l.source } : {}),
    ...(l?.medium ? { utm_medium: l.medium } : {}),
    ...(l?.campaign ? { utm_campaign: l.campaign } : {}),
    ...(l?.content ? { utm_content: l.content } : {}),
    ...(l?.term ? { utm_term: l.term } : {}),
  };
}

/** Cột nguồn cho profiles (chỉ ghi khi tài khoản chưa có nguồn) */
export function profileSourceColumns(a: Attribution) {
  const f = a.f ?? a.l;
  const l = a.l ?? a.f;
  return {
    first_channel: f?.channel ?? "direct",
    first_utm_source: f?.source ?? null,
    first_utm_campaign: f?.campaign ?? null,
    first_utm_content: f?.content ?? null,
    first_referrer: f?.referrer ?? null,
    first_landing: f?.landing ?? null,
    first_seen_at: f?.at ?? null,
    signup_channel: l?.channel ?? "direct",
    signup_utm_campaign: l?.campaign ?? null,
    signup_utm_content: l?.content ?? null,
  };
}

/**
 * Ghi nguồn cho tài khoản MỚI (tạo trong 2 ngày, chưa có nguồn). Gọi ngay sau khi đăng nhập/đăng ký.
 * Tài khoản cũ không bị ghi đè (tránh gán nhầm kênh của lần đăng nhập sau).
 */
export async function saveSignupSource(userId: string) {
  const { createAdminSupabase } = await import("@/lib/supabase/admin");
  const a = await readAttribution();
  if (!a.f && !a.l) return;
  await createAdminSupabase()
    .from("profiles")
    .update(profileSourceColumns(a))
    .eq("id", userId)
    .is("first_channel", null)
    .gte("created_at", new Date(Date.now() - 2 * 86_400_000).toISOString());
}
