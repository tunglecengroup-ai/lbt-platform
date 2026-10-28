"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkout, type CheckoutState } from "./actions";

const inputClass =
  "bg-background focus:border-primary focus:ring-primary/20 h-11 w-full rounded-md border px-3 text-sm outline-none focus:ring-2";

export function CheckoutForm({ slug, defaultEmail, defaultName }: { slug: string; defaultEmail?: string; defaultName?: string }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkout, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Họ và tên</label>
        <input id="name" name="name" required autoComplete="name" defaultValue={defaultName} className={inputClass} />
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={defaultEmail} placeholder="ban@email.com" className={inputClass} />
        <p className="text-muted-foreground mt-1 text-xs">Dùng email này để đăng nhập vào học sau khi thanh toán.</p>
      </div>
      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">Số điện thoại / Zalo</label>
        <input id="phone" name="phone" type="tel" required autoComplete="tel" className={inputClass} />
      </div>
      {state.error && (
        <p role="alert" className="text-danger bg-danger-soft rounded-md px-3 py-2 text-sm">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="h-12 w-full text-base">
        {pending ? <><LoaderCircle className="size-4 animate-spin" /> Đang tạo đơn…</> : "Tiếp tục thanh toán"}
      </Button>
    </form>
  );
}
