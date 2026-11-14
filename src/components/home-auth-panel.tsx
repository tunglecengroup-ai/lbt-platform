"use client";

import { Suspense, useState } from "react";
import { StudentAuthForm } from "@/components/student-auth-form";
import { cn } from "@/lib/utils";

/** Khung "Đăng ký học thử / Đăng nhập" đặt ngay trên trang chủ */
export function HomeAuthPanel({ from }: { from: string }) {
  const [tab, setTab] = useState<"register" | "login">("register");
  return (
    <div>
      <div className="bg-muted grid grid-cols-2 rounded-lg p-1 text-sm font-semibold">
        {(["register", "login"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("rounded-md py-2 transition-colors", tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {t === "register" ? "Đăng ký học thử" : "Đăng nhập"}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Suspense fallback={null}>
          <StudentAuthForm key={tab} mode={tab} embed from={from} />
        </Suspense>
      </div>
    </div>
  );
}
