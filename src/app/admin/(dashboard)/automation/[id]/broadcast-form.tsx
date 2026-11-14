"use client";

import { useActionState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startBroadcast, type BroadcastState } from "../campaign-actions";

export function BroadcastForm({ id, count }: { id: string; count: number }) {
  const [state, action, pending] = useActionState<BroadcastState, FormData>(startBroadcast, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Gửi chiến dịch cho ${count} người trong nhóm? Người đã nhận chiến dịch này trước đó sẽ được bỏ qua.`)) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" disabled={pending || count === 0} className="w-full">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />} Gửi cho {count} người
      </Button>
      {state.error && <p className="text-danger text-sm">{state.error}</p>}
      {state.message && <p className="text-success text-sm">{state.message}</p>}
    </form>
  );
}
