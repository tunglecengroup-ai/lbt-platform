import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

/** Trang chờ thanh toán hỏi trạng thái đơn mỗi vài giây */
export async function GET(_req: Request, ctx: RouteContext<"/api/don-hang/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ status: "not_found" }, { status: 404 });

  const { data } = await createAdminSupabase().from("orders").select("status").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ status: "not_found" }, { status: 404 });
  return NextResponse.json({ status: data.status }, { headers: { "Cache-Control": "no-store" } });
}
