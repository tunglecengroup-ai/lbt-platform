"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        const from = params.get("from") || "/";
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
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="bg-primary text-primary-foreground mb-4 flex size-12 items-center justify-center rounded-xl text-lg font-bold">
            LBT
          </span>
          <h1 className="text-xl font-semibold tracking-tight">LBT Platform</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Khu vực quản trị — vui lòng đăng nhập
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-card space-y-4 rounded-lg border p-6 shadow-sm"
        >
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
              Mật khẩu truy cập
            </label>
            <div className="relative">
              <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                id="password"
                name="password"
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu…"
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
                <LoaderCircle className="size-4 animate-spin" /> Đang kiểm tra…
              </>
            ) : (
              "Đăng nhập"
            )}
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-xs">
          Chỉ dành cho đội ngũ Học viện Lê Bá Tùng
        </p>
      </div>
    </div>
  );
}
