"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, LoaderCircle, GraduationCap, KeyRound, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { marketingHref } from "@/lib/site";

const inputClass =
  "bg-background focus:border-primary focus:ring-primary/20 h-11 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus:ring-2";

/** "0912 345 678" / "+84912345678" -> "0912345678"; sai định dạng -> null */
function normalizePhone(raw: string) {
  const p = raw.replace(/[\s.\-()]/g, "").replace(/^\+?84/, "0");
  return /^0\d{9,10}$/.test(p) ? p : null;
}

/**
 * Đăng nhập / đăng ký không mật khẩu: nhập email -> Supabase gửi mã -> nhập mã là vào.
 * Đăng ký thêm họ tên + SĐT, ghi vào profiles sau khi xác nhận mã (RLS profiles_update_own).
 * (Email cũng có link đăng nhập, bấm link đi qua /auth/confirm.)
 */
export function StudentAuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/hoc";
  const register = mode === "register";
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState(params.get("error") ? "Link đăng nhập đã hết hạn, vui lòng lấy mã mới" : "");
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setError("");
    if (register) {
      if (fullName.trim().length < 2) return setError("Vui lòng nhập họ tên");
      if (!normalizePhone(phone)) return setError("Số điện thoại chưa đúng (vd 0912 345 678)");
    }
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(from)}`,
        ...(register && { data: { full_name: fullName.trim() } }),
      },
    });
    setLoading(false);
    if (error) {
      setError(error.status === 429 ? "Bạn gửi mã quá nhanh, đợi 1 phút rồi thử lại" : "Không gửi được mã: " + error.message);
      return;
    }
    setStep("code");
  }

  async function verifyCode() {
    setError("");
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });
    if (error || !data.user) {
      setLoading(false);
      setError("Mã không đúng hoặc đã hết hạn");
      return;
    }
    if (register) {
      await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), phone: normalizePhone(phone) })
        .eq("id", data.user.id);
    }
    router.replace(from);
    router.refresh();
  }

  const otherHref = `${register ? "/hoc/dang-nhap" : "/hoc/dang-ky"}${from !== "/hoc" ? `?from=${encodeURIComponent(from)}` : ""}`;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href={marketingHref("/")} className="bg-primary text-primary-foreground mb-4 flex size-12 items-center justify-center rounded-xl">
            <GraduationCap className="size-6" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">{register ? "Tạo tài khoản học viên" : "Học viện Lê Bá Tùng"}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {step === "code"
              ? `Mã xác nhận đã gửi tới ${email}`
              : register
                ? "Miễn phí — không cần mật khẩu, đăng nhập bằng mã gửi qua email"
                : "Đăng nhập để vào khu học tập"}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step === "email") sendCode();
            else verifyCode();
          }}
          className="bg-card space-y-4 rounded-lg border p-6 shadow-sm"
        >
          {step === "email" ? (
            <>
              {register && (
                <div>
                  <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium">Họ và tên</label>
                  <div className="relative">
                    <User className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <input id="full_name" required autoFocus autoComplete="name" value={fullName}
                      onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" className={inputClass} />
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium">{register ? "Email" : "Email đã đăng ký học"}</label>
                <div className="relative">
                  <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <input id="email" type="email" required autoFocus={!register} autoComplete="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" className={inputClass} />
                </div>
              </div>
              {register && (
                <div>
                  <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">Số điện thoại / Zalo</label>
                  <div className="relative">
                    <Phone className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <input id="phone" type="tel" inputMode="tel" required autoComplete="tel" value={phone}
                      onChange={(e) => setPhone(e.target.value)} placeholder="0912 345 678" className={inputClass} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <label htmlFor="code" className="mb-1.5 block text-sm font-medium">Mã xác nhận trong email</label>
              <div className="relative">
                <KeyRound className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <input id="code" inputMode="numeric" required autoFocus autoComplete="one-time-code" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="Nhập mã số" className={`${inputClass} tracking-[0.3em]`} />
              </div>
              <p className="text-muted-foreground mt-1.5 text-xs">Không thấy email? Kiểm tra mục Spam / Quảng cáo.</p>
            </div>
          )}

          {error && (
            <p role="alert" className="text-danger bg-danger-soft rounded-md px-3 py-2 text-sm">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="h-11 w-full">
            {loading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : step === "code" ? (
              register ? "Xác nhận & tạo tài khoản" : "Đăng nhập"
            ) : register ? (
              "Đăng ký"
            ) : (
              "Gửi mã đăng nhập"
            )}
          </Button>

          {step === "code" && (
            <button type="button" onClick={() => { setStep("email"); setCode(""); }}
              className="text-muted-foreground hover:text-foreground w-full text-center text-xs">
              Đổi email / gửi lại mã
            </button>
          )}
        </form>

        {step === "email" && (
          <p className="text-muted-foreground mt-5 text-center text-sm">
            {register ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
            <Link href={otherHref} className="text-primary font-medium hover:underline">
              {register ? "Đăng nhập" : "Đăng ký miễn phí"}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
