"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, KeyRound, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { activateCode, type ActivateState } from "./actions";

export function ActivateForm() {
  const [state, action, pending] = useActionState<ActivateState, FormData>(activateCode, {});

  if (state.course) {
    return (
      <div className="text-center">
        <CheckCircle2 className="text-success mx-auto size-12" />
        <p className="mt-3 text-lg font-semibold">Kích hoạt thành công!</p>
        <p className="text-muted-foreground mt-1 text-sm">Bạn đã có quyền học “{state.course.title}”.</p>
        <Button asChild className="mt-5 w-full">
          <Link href={`/hoc/${state.course.slug}`}>Vào học ngay</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input
        name="code"
        required
        autoFocus
        autoComplete="off"
        placeholder="VD: AB3K-9XQ2-MP"
        className={`${inputClass} h-12 text-center font-mono text-lg tracking-widest uppercase`}
      />
      {state.error && <p className="text-danger text-sm">{state.error}</p>}
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Kích hoạt
      </Button>
    </form>
  );
}
