"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { adminCreateOrder, type NewOrderState } from "../actions";

type Item = { value: string; label: string; price: number };

/** Form tạo đơn tay */
export function NewOrderForm({ items, channels }: { items: Item[]; channels: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<NewOrderState, FormData>(adminCreateOrder, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Họ tên khách"><input name="customer_name" required className={inputClass} /></Field>
      <Field label="Số điện thoại"><input name="customer_phone" className={inputClass} /></Field>
      <Field label="Email (khách dùng email này để vào học)" className="sm:col-span-2"><input name="customer_email" type="email" required className={inputClass} /></Field>
      <Field label="Khóa học / gói thành viên" className="sm:col-span-2">
        <select name="item" required defaultValue="" className={inputClass}>
          <option value="" disabled>Chọn khóa học hoặc gói</option>
          {items.map((i) => <option key={i.value} value={i.value}>{i.label} — {i.price.toLocaleString("vi-VN")} đ</option>)}
        </select>
      </Field>
      <Field label="Số tiền (đ)" hint="Để trống = giá bán của khóa/gói"><input name="amount" inputMode="numeric" className={inputClass} /></Field>
      <Field label="Kênh nguồn">
        <select name="channel" defaultValue="" className={inputClass}>
          <option value="">Chưa rõ</option>
          {channels.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="Chiến dịch (không bắt buộc)"><input name="utm_campaign" placeholder="vd: ads99, livestream 20/11" className={inputClass} /></Field>
      <Field label="Ghi chú"><input name="admin_note" placeholder="vd: chuyển khoản qua Zalo, tiền mặt…" className={inputClass} /></Field>
      <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
        <input type="checkbox" name="paid" className="size-4" />
        Khách đã thanh toán — mở khóa học ngay
      </label>
      {state.error && <p role="alert" className="text-danger bg-danger-soft rounded-md px-3 py-2 text-sm sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? <><LoaderCircle className="size-4 animate-spin" /> Đang tạo…</> : "Tạo đơn"}</Button>
      </div>
    </form>
  );
}
