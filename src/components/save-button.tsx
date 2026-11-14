"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Nút Lưu cho form gọi server action: đang lưu -> vòng quay "Đang lưu…",
 * lưu xong -> nút xanh "Đã lưu" + thông báo nhỏ góc trên phải (tự ẩn sau 2,5 giây).
 * Lỗi thì trang báo lỗi như cũ (action ném lỗi), không hiện "Đã lưu".
 */
export function SaveButton({
  children = "Lưu",
  size,
  variant,
  className,
}: {
  children?: React.ReactNode;
  size?: "sm" | "default";
  variant?: "primary" | "outline";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const [prevPending, setPrevPending] = useState(pending);
  const [saved, setSaved] = useState(false);

  // Vừa lưu xong (pending: true -> false) thì bật "Đã lưu" — chỉnh state ngay khi render, không qua effect
  if (prevPending !== pending) {
    setPrevPending(pending);
    setSaved(!pending);
  }

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  return (
    <>
      <Button
        type="submit"
        size={size}
        variant={saved ? "primary" : variant}
        disabled={pending}
        className={cn("min-w-24 transition-all", saved && "bg-emerald-600 text-white hover:bg-emerald-600", className)}
      >
        {pending ? (
          <><LoaderCircle className="size-4 animate-spin" /> Đang lưu…</>
        ) : saved ? (
          <><Check className="size-4" /> Đã lưu</>
        ) : (
          children
        )}
      </Button>
      {saved && (
        <div role="status" className="fixed top-4 right-4 z-[70] toast-in flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <Check className="size-4" /> Đã lưu thay đổi
        </div>
      )}
    </>
  );
}
