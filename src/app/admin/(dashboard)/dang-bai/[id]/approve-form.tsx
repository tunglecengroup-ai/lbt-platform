"use client";

import { useActionState } from "react";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveSocialPost, type ApproveState } from "../actions";

export function ApproveForm({ id, scheduled }: { id: string; scheduled: boolean }) {
  const [state, action, pending] = useActionState<ApproveState, FormData>(approveSocialPost, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(scheduled ? "Duyệt và hẹn giờ đăng bài này ra các kênh đã chọn?" : "Duyệt và ĐĂNG NGAY bài này ra các kênh đã chọn?")) e.preventDefault();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
        {scheduled ? "Duyệt & hẹn giờ đăng" : "Duyệt & đăng ngay"}
      </Button>
      {state.errors && (
        <ul className="bg-danger-soft text-danger space-y-1 rounded-md px-3 py-2 text-sm">
          {state.errors.map((e) => <li key={e}>• {e}</li>)}
        </ul>
      )}
      {state.ok && <p className="text-success flex items-center gap-1.5 text-sm"><CheckCircle2 className="size-4" /> Đã duyệt — xem trạng thái từng kênh bên dưới.</p>}
    </form>
  );
}
