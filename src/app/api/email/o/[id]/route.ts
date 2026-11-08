import { createAdminSupabase } from "@/lib/supabase/admin";

// Ảnh 1x1 trong suốt — đánh dấu email đã mở
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(_req: Request, ctx: RouteContext<"/api/email/o/[id]">) {
  const { id } = await ctx.params;
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    await createAdminSupabase().from("automation_messages").update({ opened_at: new Date().toISOString() }).eq("id", id).is("opened_at", null);
  }
  return new Response(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" } });
}
