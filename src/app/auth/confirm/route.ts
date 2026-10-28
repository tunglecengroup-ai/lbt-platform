import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

/** Học viên bấm link trong email đăng nhập -> đổi token lấy phiên rồi vào học */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/hoc";
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createServerSupabase();
  const { error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("missing token") };

  if (error) return NextResponse.redirect(new URL("/hoc/dang-nhap?error=1", request.url));
  return NextResponse.redirect(new URL(next, request.url));
}
