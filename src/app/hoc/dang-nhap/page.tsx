"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, LoaderCircle, GraduationCap, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function StudentLoginPage() {
  return (
    <Suspense>
      <StudentLoginForm />
    </Suspense>
  );
}

const inputClass =
  "bg-background focus:border-primary focus:ring-primary/20 h-11 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus:ring-2";

/**
 * Đăng nhập không mật khẩu: nhập email -> Supabase gửi mã 6 số -> nhập mã là vào.
 * (Email cũng có link đăng nhập, bấm link đi qua /auth/confirm.)
 */
function StudentLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/hoc";
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState(params.get("error") ? "Link đăng nhập đã hết hạn, vui lòng lấy mã mới" : "");
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setError("");
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(from)}`,
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
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setLoading(false);
      setError("Mã không đúng hoặc đã hết hạn");
      return;
    }
    router.replace(from);
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="bg-primary text-primary-foreground mb-4 flex size-12 items-center justify-center rounded-xl">
            <GraduationCap className="size-6" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Học viện Lê Bá Tùng</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {step === "email" ? "Đăng nhập để vào khu học tập" : `Mã đăng nhập đã gửi tới ${email}`}
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
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email đã đăng ký học</label>
              <div className="relative">
                <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <input id="email" type="email" required autoFocus autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" className={inputClass} />
              </div>
            </div>
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
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : step === "email" ? "Gửi mã đăng nhập" : "Đăng nhập"}
          </Button>

          {step === "code" && (
            <button type="button" onClick={() => { setStep("email"); setCode(""); }}
              className="text-muted-foreground hover:text-foreground w-full text-center text-xs">
              Đổi email / gửi lại mã
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
