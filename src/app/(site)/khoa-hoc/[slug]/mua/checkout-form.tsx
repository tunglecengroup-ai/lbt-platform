"use client";

import { useActionState, useEffect, useRef } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkout, type CheckoutState } from "./actions";

const inputClass =
  "bg-background focus:border-primary focus:ring-primary/20 h-11 w-full rounded-md border px-3 text-sm outline-none focus:ring-2";

export function CheckoutForm({ slug, kind = "course" }: { slug: string; kind?: "course" | "plan" }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkout, {});
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Trang mua được lưu sẵn (nhanh) -> điền sẵn tên/email của người đã đăng nhập ngay tại trình duyệt
  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      if (emailRef.current && !emailRef.current.value) emailRef.current.value = user.email ?? "";
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      const name = p?.full_name || (user.user_metadata?.full_name as string | undefined);
      if (name && nameRef.current && !nameRef.current.value) nameRef.current.value = name;
    }).catch(() => {});
  }, []);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="kind" value={kind} />
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Họ và tên</label>
        <input ref={nameRef} id="name" name="name" required autoComplete="name" className={inputClass} />
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
        <input ref={emailRef} id="email" name="email" type="email" required autoComplete="email" placeholder="ban@email.com" className={inputClass} />
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
