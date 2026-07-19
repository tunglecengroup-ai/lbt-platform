"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, LoaderCircle, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currentStudent } from "@/lib/lms-data";

export default function StudentLoginPage() {
  return (
    <Suspense>
      <StudentLoginForm />
    </Suspense>
  );
}

function StudentLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(value: string) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/hoc/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json();
      if (data.ok) {
        const from = params.get("from") || "/hoc";
        router.replace(from);
        router.refresh();
      } else {
        setError(data.error || "Đăng nhập thất bại");
        setLoading(false);
      }
    } catch {
      setError("Không kết nối được máy chủ");
      setLoading(false);
    }
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
            Đăng nhập để vào khu học tập
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            login(email);
          }}
          className="bg-card space-y-4 rounded-lg border p-6 shadow-sm"
        >
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email học viên
            </label>
            <div className="relative">
              <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                id="email"
                name="email"
                type="email"
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@email.com"
                className="bg-background focus:border-primary focus:ring-primary/20 h-11 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus:ring-2"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-danger bg-danger-soft rounded-md px-3 py-2 text-sm">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="h-11 w-full">
            {loading ? (
              <>
                <LoaderCircle className="size-4 animate-spin" /> Đang vào…
              </>
            ) : (
              "Đăng nhập"
            )}
          </Button>

          <div className="relative py-1 text-center">
            <span className="bg-card text-muted-foreground relative z-10 px-2 text-xs">
              hoặc
            </span>
            <span className="absolute inset-x-0 top-1/2 border-t" />
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => login(currentStudent.email)}
            className="h-11 w-full"
          >
            Vào thử với tài khoản demo
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-xs">
          Bản demo — nhập email bất kỳ là vào được. Khi hoàn thiện sẽ đăng nhập
          bằng Google / mật khẩu thật.
        </p>
      </div>
    </div>
  );
}
