import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { CHANNELS, type Channel } from "@/lib/channels";

const s = (v: unknown, n = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

/** POST /api/track/visit — 1 lượt ghé web / phiên (gửi từ SourceTracker) */
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  if (/bot|crawler|spider|facebookexternalhit|preview|headless|lighthouse/i.test(ua)) return NextResponse.json({ ok: true });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const channel = (typeof b.channel === "string" && b.channel in CHANNELS ? b.channel : "other") as Channel;
  const { error } = await createAdminSupabase().from("site_visits").insert({
    visitor_id: s(b.visitor_id, 64),
    channel,
    utm_source: s(b.source),
    utm_medium: s(b.medium),
    utm_campaign: s(b.campaign),
    utm_content: s(b.content),
    utm_term: s(b.term),
    referrer: s(b.referrer, 300),
    landing: s(b.landing, 300),
    is_first: b.is_first === true,
  });
  if (error) console.error("site_visit", error.message);
  return NextResponse.json({ ok: !error });
}
