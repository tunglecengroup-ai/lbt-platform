"use client";

import { useActionState, useState } from "react";
import { Copy, KeyRound, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { createApiKey, type KeyState } from "./actions";

export function KeyForm() {
  const [state, action, pending] = useActionState<KeyState, FormData>(createApiKey, {});
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-3">
      <form action={action} className="flex gap-2">
        <input name="name" placeholder="Tên hệ thống, vd: Pancake POS" className={inputClass} />
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Tạo khóa
        </Button>
      </form>
      {state.error && <p className="text-danger text-sm">{state.error}</p>}
      {state.key && (
        <div className="bg-warning-soft space-y-2 rounded-md p-3 text-sm">
          <p className="font-medium">Khóa cho &quot;{state.name}&quot; — chỉ hiện MỘT lần, hãy sao chép và lưu lại ngay:</p>
          <div className="flex gap-2">
            <code className="bg-card flex-1 overflow-x-auto rounded border px-2 py-1.5 text-xs">{state.key}</code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(state.key!);
                setCopied(true);
              }}
            >
              <Copy className="size-4" /> {copied ? "Đã chép" : "Chép"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
