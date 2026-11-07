"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { importStudents, type ImportState } from "./actions";

export function ImportForm({ courses }: { courses: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importStudents, {});
  const [picked, setPicked] = useState<string[]>([]);
  const allPicked = courses.length > 0 && picked.length === courses.length;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <form action={action} className="space-y-3">
      <Field label={`Khóa học (${picked.length}/${courses.length} đã chọn)`}>
        <div className="border-border max-h-64 space-y-0.5 overflow-y-auto rounded-md border p-2">
          <label className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium">
            <input type="checkbox" className="size-4 accent-current" checked={allPicked}
              onChange={() => setPicked(allPicked ? [] : courses.map((c) => c.id))} />
            Chọn tất cả
          </label>
          <div className="border-border my-1 border-t" />
          {courses.map((c) => (
            <label key={c.id} className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm">
              <input type="checkbox" name="course_id" value={c.id} className="size-4 shrink-0 accent-current"
                checked={picked.includes(c.id)} onChange={() => toggle(c.id)} />
              {c.title}
            </label>
          ))}
        </div>
      </Field>
      <Field label="Danh sách học viên" hint="Mỗi dòng: email, họ tên, số điện thoại — dán thẳng từ Excel/Edubit được. 1 người cũng được.">
        <textarea name="rows" rows={6} required className={`${inputClass} h-auto py-2 font-mono text-xs`}
          placeholder={"an.nguyen@gmail.com, Nguyễn Văn An, 0912345678\nbinh@gmail.com, Trần Bình, 0987654321"} />
      </Field>
      <Button type="submit" disabled={pending || picked.length === 0}>
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />} Cấp quyền học
      </Button>
      {state.message && <p className="text-success text-sm font-medium">{state.message}</p>}
      {state.errors && state.errors.length > 0 && (
        <ul className="text-danger bg-danger-soft space-y-0.5 rounded-md px-3 py-2 text-xs">
          {state.errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
    </form>
  );
}
