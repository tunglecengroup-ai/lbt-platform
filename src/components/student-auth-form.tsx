"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, LoaderCircle, GraduationCap, KeyRound, User, Phone, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { track } from "@/lib/track";
import { marketingHref } from "@/lib/site";

const inputClass =
  "bg-background focus:border-primary focus:ring-primary/20 h-11 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus:ring-2";

/** "0912 345 678" / "+84912345678" -> "0912345678"; sai định dạng -> null */
function normalizePhone(raw: string) {
  const p = raw.replace(/[\s.\-()]/g, "").replace(/^\+?84/, "0");
  return /^0\d{9,10}$/.test(p) ? p : null;
}

function Field({ id, label, icon: Icon, children }: { id: string; label: string; icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      <div className="relative">
        <Icon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        {children}
      </div>
    </div>
  );
}

/**
 * Đăng nhập: mặc định EMAIL + MẬT KHẨU; chưa có / quên mật khẩu -> nhận MÃ qua email.
 * Vào bằng mã mà chưa có mật khẩu (hoặc bấm "Quên mật khẩu") -> mời đặt mật khẩu (bỏ qua được),
 * lần sau khỏi chờ mã -> đỡ tốn hạn mức email.
 * Đăng ký: họ tên + email + SĐT -> mã -> đặt mật khẩu. Họ tên/SĐT ghi vào profiles (RLS profiles_update_own).
 * (Email cũng có nút vào học, bấm đi qua /auth/confirm.)
 */
export function StudentAuthForm({ mode }: { mode: "login" | "register" }) {
  const params = useSearchParams();
  // Chỉ cho quay về đường dẫn trong web (chặn chuyển hướng ra trang lạ)
  const rawFrom = params.get("from") || "/hoc";
  const from = rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : "/hoc";
  const register = mode === "register";
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [step, setStep] = useState<"email" | "code" | "set-password">("email");
  // Đăng nhập: mật khẩu (mặc định) hoặc nhận mã. Đăng ký luôn qua mã.
  const [method, setMethod] = useState<"password" | "code">(register ? "code" : "password");
  const [forgot, setForgot] = useState(false);
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
      track("sign_up", { method: "email" });
    }
    // Chưa có mật khẩu (hoặc vào bằng "Quên mật khẩu") -> mời đặt mật khẩu cho lần sau
    if (forgot || !data.user.user_metadata?.has_password) {
      setLoading(false);
      setPassword("");
      setStep("set-password");
      return;
    }
    finish();
  }

  async function loginWithPassword() {
    setError("");
    setLoading(true);
    const { error } = await createBrowserSupabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      setLoading(false);
      setError(
        error.status === 429
          ? "Bạn thử quá nhiều lần, đợi vài phút rồi thử lại"
          : "Sai email hoặc mật khẩu. Chưa đặt mật khẩu? Bấm “Đăng nhập bằng mã qua email” bên dưới.",
      );
      return;
    }
    finish();
  }

  async function savePassword() {
    setError("");
    if (password.length < 6) return setError("Mật khẩu cần ít nhất 6 ký tự");
    if (password !== password2) return setError("Hai lần nhập mật khẩu chưa khớp");
    setLoading(true);
    const { error } = await createBrowserSupabase().auth.updateUser({ password, data: { has_password: true } });
    if (error) {
      setLoading(false);
      setError(
        /weak|pwned|leaked|characters/i.test(error.message)
          ? "Mật khẩu quá yếu, hãy chọn mật khẩu dài hơn, có cả chữ và số"
          : /same|different/i.test(error.message)
            ? "Mật khẩu mới phải khác mật khẩu cũ"
            : "Không lưu được mật khẩu: " + error.message,
      );
      return;
    }
    finish();
  }

  /** Vào học: việc phụ chạy ngầm, chuyển trang ngay */
  function finish() {
    // Kịch bản chào mừng tài khoản mới chạy ngầm — không bắt học viên chờ
    if (!navigator.sendBeacon?.("/api/hoc/sau-dang-nhap")) {
      fetch("/api/hoc/sau-dang-nhap", { method: "POST", keepalive: true }).catch(() => {});
    }
    // Chuyển trang hẳn (tải lại với cookie phiên mới) thay vì router.replace + refresh dễ treo
    window.location.replace(from);
  }

  function submit() {
    if (step === "set-password") return savePassword();
    if (step === "code") return verifyCode();
    if (!register && method === "password") return loginWithPassword();
    return sendCode();
  }

  const switchMethod = (m: "password" | "code", isForgot = false) => {
    setMethod(m);
    setForgot(isForgot);
    setError("");
  };

  const otherHref = `${register ? "/hoc/dang-nhap" : "/hoc/dang-ky"}${from !== "/hoc" ? `?from=${encodeURIComponent(from)}` : ""}`;

  const subtitle =
    step === "set-password"
      ? "Đặt mật khẩu để lần sau đăng nhập nhanh, không cần chờ mã"
      : step === "code"
        ? `Mã xác nhận đã gửi tới ${email}`
        : register
          ? "Miễn phí — xác nhận email bằng mã, sau đó đặt mật khẩu"
          : forgot
            ? "Nhập email để nhận mã, sau đó đặt mật khẩu mới"
            : "Đăng nhập để vào khu học tập";

  const buttonLabel =
    step === "set-password"
      ? "Lưu mật khẩu & vào học"
      : step === "code"
        ? register ? "Xác nhận & tạo tài khoản" : "Xác nhận mã"
        : register
          ? "Đăng ký"
          : method === "password"
            ? "Đăng nhập"
            : "Gửi mã qua email";

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href={marketingHref("/")} className="bg-primary text-primary-foreground mb-4 flex size-12 items-center justify-center rounded-xl">
            <GraduationCap className="size-6" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">{register ? "Tạo tài khoản học viên" : "Học viện Lê Bá Tùng"}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="bg-card space-y-4 rounded-lg border p-6 shadow-sm"
        >
          {step === "email" && (
            <>
              {register && (
                <Field id="full_name" label="Họ và tên" icon={User}>
                  <input id="full_name" required autoFocus autoComplete="name" value={fullName}
                    onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" className={inputClass} />
                </Field>
              )}
              <Field id="email" label={register ? "Email" : "Email đã đăng ký học"} icon={Mail}>
                <input id="email" type="email" required autoFocus={!register} autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" className={inputClass} />
              </Field>
              {!register && method === "password" && (
                <Field id="password" label="Mật khẩu" icon={Lock}>
                  <input id="password" type="password" required autoComplete="current-password" value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu của bạn" className={inputClass} />
                </Field>
              )}
              {register && (
                <Field id="phone" label="Số điện thoại / Zalo" icon={Phone}>
                  <input id="phone" type="tel" inputMode="tel" required autoComplete="tel" value={phone}
                    onChange={(e) => setPhone(e.target.value)} placeholder="0912 345 678" className={inputClass} />
                </Field>
              )}
            </>
          )}

          {step === "code" && (
            <div>
              <Field id="code" label="Mã xác nhận trong email" icon={KeyRound}>
                <input id="code" inputMode="numeric" required autoFocus autoComplete="one-time-code" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="Nhập mã số" className={`${inputClass} tracking-[0.3em]`} />
              </Field>
              <p className="text-muted-foreground mt-1.5 text-xs">Không thấy email? Kiểm tra mục Spam / Quảng cáo.</p>
            </div>
          )}

          {step === "set-password" && (
            <>
              <Field id="new_password" label="Mật khẩu mới" icon={Lock}>
                <input id="new_password" type="password" required autoFocus autoComplete="new-password" value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="Ít nhất 6 ký tự" className={inputClass} />
              </Field>
              <Field id="new_password2" label="Nhập lại mật khẩu" icon={Lock}>
                <input id="new_password2" type="password" required autoComplete="new-password" value={password2}
                  onChange={(e) => setPassword2(e.target.value)} className={inputClass} />
              </Field>
            </>
          )}

          {error && (
            <p role="alert" className="text-danger bg-danger-soft rounded-md px-3 py-2 text-sm">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="h-11 w-full">
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : buttonLabel}
          </Button>

          {step === "code" && (
            <button type="button" onClick={() => { setStep("email"); setCode(""); }}
              className="text-muted-foreground hover:text-foreground w-full text-center text-xs">
              Đổi email / gửi lại mã
            </button>
          )}
          {step === "set-password" && (
            <button type="button" onClick={finish}
              className="text-muted-foreground hover:text-foreground w-full text-center text-xs">
              Bỏ qua, lần sau vẫn đăng nhập bằng mã
            </button>
          )}
          {step === "email" && !register && (
            <div className="flex flex-col items-center gap-2 text-xs">
              {method === "password" ? (
                <>
                  <button type="button" onClick={() => switchMethod("code")} className="text-primary font-medium hover:underline">
                    Chưa có mật khẩu? Đăng nhập bằng mã qua email
                  </button>
                  <button type="button" onClick={() => switchMethod("code", true)} className="text-muted-foreground hover:text-foreground">
                    Quên mật khẩu
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => switchMethod("password")} className="text-primary font-medium hover:underline">
                  Đăng nhập bằng mật khẩu
                </button>
              )}
            </div>
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
