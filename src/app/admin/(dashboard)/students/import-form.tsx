"use client";

import { useActionState } from "react";
import { LoaderCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { importStudents, type ImportState } from "./actions";

export function ImportForm({ courses }: { courses: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importStudents, {});

  return (
    <form action={action} className="space-y-3">
      <Field label="Khóa học">
        <select name="course_id" required className={inputClass}>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </Field>
      <Field label="Danh sách học viên" hint="Mỗi dòng: email, họ tên, số điện thoại — dán thẳng từ Excel/Edubit được. 1 người cũng được.">
        <textarea name="rows" rows={6} required className={`${inputClass} h-auto py-2 font-mono text-xs`}
          placeholder={"an.nguyen@gmail.com, Nguyễn Văn An, 0912345678\nbinh@gmail.com, Trần Bình, 0987654321"} />
      </Field>
      <Button type="submit" disabled={pending}>
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
