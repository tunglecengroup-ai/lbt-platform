import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { cleanUtm } from "@/lib/landing";

/** POST /api/l/event — ghi lượt xem / bắt đầu điền form của trang bán (gọi từ trình duyệt) */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const landingId = String(body.landing_id ?? "");
  const kind = body.kind === "checkout" ? "checkout" : body.kind === "view" ? "view" : null;
  if (!/^[0-9a-f-]{36}$/i.test(landingId) || !kind) return NextResponse.json({ ok: false }, { status: 400 });
  // Bỏ qua bot thường gặp
  const ua = req.headers.get("user-agent") || "";
  if (/bot|crawler|spider|facebookexternalhit|preview|headless/i.test(ua)) return NextResponse.json({ ok: true });

  const { error } = await createAdminSupabase()
    .from("landing_events")
    .insert({
      landing_id: landingId,
      kind,
      visitor_id: String(body.visitor_id ?? "").slice(0, 64) || null,
      referrer: String(body.referrer ?? "").slice(0, 300) || null,
      ...cleanUtm(body),
    });
  if (error) console.error("landing_event", error.message);
  return NextResponse.json({ ok: !error });
}
