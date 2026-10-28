"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Copy, LoaderCircle, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function CopyValue({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label="Sao chép"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-8 items-center justify-center rounded-md"
    >
      {done ? <Check className="text-success size-4" /> : <Copy className="size-4" />}
    </button>
  );
}

/** Hỏi trạng thái đơn mỗi 3 giây; tiền về thì tải lại trang để hiện màn thành công */
export function PaymentWatcher({ orderId }: { orderId: string }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/don-hang/${orderId}`, { cache: "no-store" });
        const { status } = await res.json();
        if (status !== "pending") {
          clearInterval(timer);
          router.refresh();
        }
      } catch {
        // mạng chập chờn -> thử lại lượt sau
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [orderId, router]);

  return (
    <p className="text-muted-foreground flex items-center gap-2 text-xs">
      <LoaderCircle className="size-3.5 animate-spin" /> Đang chờ xác nhận thanh toán… (giữ nguyên trang này)
    </p>
  );
}

export function PaidPanel({ email, courseSlug, courseTitle }: { email: string; courseSlug: string; courseTitle: string }) {
  const loginHref = `/hoc/dang-nhap?email=${encodeURIComponent(email)}&from=${encodeURIComponent(`/hoc/${courseSlug}`)}`;
  return (
    <Card className="p-8 text-center">
      <span className="bg-success-soft text-success mx-auto flex size-14 items-center justify-center rounded-full">
        <PartyPopper className="size-7" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold">Thanh toán thành công!</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Khóa <b className="text-foreground">{courseTitle}</b> đã được mở cho tài khoản{" "}
        <b className="text-foreground">{email}</b>.
      </p>
      <Button asChild className="mt-6 h-12 w-full text-base">
        <Link href={loginHref}>Vào học ngay</Link>
      </Button>
      <p className="text-muted-foreground mt-3 text-xs">
        Đăng nhập bằng email trên — hệ thống gửi mã xác nhận vào hộp thư, không cần mật khẩu.
      </p>
    </Card>
  );
}
