import { NextResponse } from "next/server";
import { afterSignIn } from "@/app/hoc/actions";
import { createServerSupabase } from "@/lib/supabase/server";
import { saveSignupSource } from "@/lib/attribution";

/** Trình duyệt bắn ngầm (sendBeacon) ngay sau khi đăng nhập — không bắt học viên chờ */
export async function POST() {
  const { data } = await (await createServerSupabase()).auth.getUser();
  await Promise.all([
    afterSignIn(),
    // Tài khoản mới: ghi kênh khách đến (Facebook, TikTok, YouTube…) từ cookie nguồn
    data.user ? saveSignupSource(data.user.id).catch((e) => console.error("signup source", e)) : null,
  ]);
  return NextResponse.json({ ok: true });
}
