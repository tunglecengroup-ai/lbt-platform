"use client";

import { useActionState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendTestStep, type TestState } from "../actions";

export function TestForm({ stepId, defaultTo }: { stepId: string; defaultTo?: string }) {
  const [state, action, pending] = useActionState<TestState, FormData>(sendTestStep, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="step_id" value={stepId} />
      <input name="to" type="email" defaultValue={defaultTo} placeholder="email nhận thử" className="bg-background h-9 min-w-0 flex-1 rounded-md border px-3 text-sm" />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />} Gửi thử
      </Button>
      {state.message && <span className="text-success text-xs">{state.message}</span>}
      {state.error && <span className="text-danger text-xs">{state.error}</span>}
    </form>
  );
}
