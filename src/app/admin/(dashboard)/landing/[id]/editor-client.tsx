"use client";

import { useActionState, useState } from "react";
import { Copy, Check, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { aiWriteLanding, type AiState } from "../actions";

export function CopyField({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="flex gap-2">
        <input readOnly value={value} className={`${inputClass} font-mono text-xs`} onFocus={(e) => e.currentTarget.select()} />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Sao chép"
          onClick={() => {
            navigator.clipboard.writeText(value).then(() => {
              setDone(true);
              setTimeout(() => setDone(false), 1500);
            });
          }}
        >
          {done ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

export function AiWriteForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<AiState, FormData>(aiWriteLanding, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("AI sẽ viết lại chữ của các khối: đầu trang, nỗi đau, lợi ích, quà tặng, hỏi đáp, kêu gọi. Video/ảnh/giảng viên giữ nguyên. Tiếp tục?")) e.preventDefault();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="id" value={id} />
      <textarea
        name="brief"
        rows={3}
        placeholder="Ghi chú cho AI (không bắt buộc): khách hàng là ai, ưu đãi đang chạy, điểm khác biệt…"
        className={`${inputClass} h-auto py-2`}
      />
      <Button type="submit" disabled={pending}>
        {pending ? <><LoaderCircle className="size-4 animate-spin" /> AI đang viết (~30 giây)…</> : <><Sparkles className="size-4" /> AI viết nội dung</>}
      </Button>
      {state.error && <p className="text-danger text-sm">{state.error}</p>}
      {state.ok && <p className="text-success text-sm">Đã viết xong — kiểm tra lại từng khối bên dưới.</p>}
    </form>
  );
}
