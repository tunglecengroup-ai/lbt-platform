"use client";

import { useActionState } from "react";
import { Crown, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { grantPlanToStudent, type GrantState } from "../../membership/actions";

export function GrantPlanForm({ userId, plans }: { userId: string; plans: { id: string; name: string; duration_days: number }[] }) {
  const [state, action, pending] = useActionState<GrantState, FormData>(grantPlanToStudent, {});
  if (plans.length === 0) return <p className="text-muted-foreground text-sm">Chưa có gói nào — tạo ở Admin → Thành viên.</p>;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="user_id" value={userId} />
      <select name="plan_id" required className={inputClass}>
        {plans.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.duration_days} ngày)</option>)}
      </select>
      <Button type="submit" variant="outline" disabled={pending} className="w-full">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Crown className="size-4" />} Kích hoạt / gia hạn gói
      </Button>
      {state.message && <p className="text-success text-sm font-medium">{state.message}</p>}
      {state.error && <p className="text-danger text-sm">{state.error}</p>}
    </form>
  );
}
