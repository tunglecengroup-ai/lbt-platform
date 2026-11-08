import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";

/** Chỉ chuyển tới tên miền của mình (tránh bị lợi dụng làm link chuyển hướng lừa đảo) */
const ALLOWED = /(^|\.)lebatung\.(com|vn)$|\.netlify\.app$|^localhost$/;

export async function GET(req: NextRequest, ctx: RouteContext<"/api/email/c/[id]">) {
  const { id } = await ctx.params;
  const raw = req.nextUrl.searchParams.get("u") ?? "";
  let target = siteUrl;
  try {
    const u = new URL(raw);
    if ((u.protocol === "https:" || u.protocol === "http:") && ALLOWED.test(u.hostname)) target = u.toString();
  } catch {}
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    const db = createAdminSupabase();
    const now = new Date().toISOString();
    await db.from("automation_messages").update({ clicked_at: now }).eq("id", id).is("clicked_at", null);
    await db.from("automation_messages").update({ opened_at: now }).eq("id", id).is("opened_at", null);
  }
  return NextResponse.redirect(target, 302);
}
