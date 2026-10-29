"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { generateCodes, importCodes, type CodesState } from "./actions";

/** Khóa học, số lượt dùng, hạn dùng, ghi chú — dùng chung cho tạo mới và nhập mã */
function CommonFields({ courses }: { courses: { id: string; title: string }[] }) {
  return (
    <>
      <Field label="Khóa học">
        <select name="course_id" required className={inputClass}>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mỗi mã dùng được" hint="số người"><input name="max_uses" inputMode="numeric" defaultValue="1" className={inputClass} /></Field>
        <Field label="Hạn dùng" hint="Bỏ trống = không hạn"><input type="date" name="expires_at" className={inputClass} /></Field>
      </div>
      <Field label="Ghi chú" hint="VD: bán qua Shopee, tặng đối tác X"><input name="note" className={inputClass} /></Field>
    </>
  );
}

function Result({ state }: { state: CodesState }) {
  if (state.message) return <p className="text-success text-sm font-medium">{state.message}</p>;
  if (state.error) return <p className="text-danger text-sm">{state.error}</p>;
  return null;
}

export function CodeForms({ courses }: { courses: { id: string; title: string }[] }) {
  const [tab, setTab] = useState<"gen" | "import">("gen");
  const [genState, genAction, genPending] = useActionState<CodesState, FormData>(generateCodes, {});
  const [impState, impAction, impPending] = useActionState<CodesState, FormData>(importCodes, {});

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b">
        {([["gen", "Tạo mã mới"], ["import", "Nhập mã có sẵn"]] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === k ? "border-primary text-foreground" : "text-muted-foreground border-transparent"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "gen" ? (
        <form action={genAction} className="space-y-3">
          <CommonFields courses={courses} />
          <Field label="Số lượng mã"><input name="quantity" inputMode="numeric" defaultValue="10" className={inputClass} /></Field>
          <Button type="submit" disabled={genPending}>
            {genPending ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Tạo mã
          </Button>
          <Result state={genState} />
        </form>
      ) : (
        <form action={impAction} className="space-y-3">
          <CommonFields courses={courses} />
          <Field label="Danh sách mã" hint="Mỗi dòng 1 mã — dán mã cũ từ Edubit hoặc mã tự đặt (VD: TANGBANTHAN2026)">
            <textarea name="codes" rows={5} required className={`${inputClass} h-auto py-2 font-mono text-xs`} />
          </Field>
          <Button type="submit" disabled={impPending}>
            {impPending ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />} Nhập mã
          </Button>
          <Result state={impState} />
        </form>
      )}
    </div>
  );
}
