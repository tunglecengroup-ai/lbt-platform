"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addCoursesToStudent, type ImportState } from "../actions";

type Option = { id: string; title: string; note?: string };

export function AddCoursesForm({ userId, courses }: { userId: string; courses: Option[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [state, action, pending] = useActionState<ImportState, FormData>(async (prev, form) => {
    const res = await addCoursesToStudent(prev, form);
    if (!res.errors?.length) setPicked([]);
    return res;
  }, {});
  const allPicked = courses.length > 0 && picked.length === courses.length;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  if (courses.length === 0) {
    return <p className="text-muted-foreground text-sm">Học viên đã có đủ tất cả các khóa.</p>;
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="user_id" value={userId} />
      <p className="text-muted-foreground text-xs">{picked.length}/{courses.length} khóa đã chọn</p>
      <div className="border-border max-h-72 space-y-0.5 overflow-y-auto rounded-md border p-2">
        {courses.length > 1 && (
          <>
            <label className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium">
              <input type="checkbox" className="size-4 accent-current" checked={allPicked}
                onChange={() => setPicked(allPicked ? [] : courses.map((c) => c.id))} />
              Chọn tất cả
            </label>
            <div className="border-border my-1 border-t" />
          </>
        )}
        {courses.map((c) => (
          <label key={c.id} className="hover:bg-muted flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm">
            <input type="checkbox" name="course_id" value={c.id} className="mt-0.5 size-4 shrink-0 accent-current"
              checked={picked.includes(c.id)} onChange={() => toggle(c.id)} />
            <span>
              {c.title}
              {c.note && <span className="text-warning block text-xs">{c.note}</span>}
            </span>
          </label>
        ))}
      </div>
      <Button type="submit" disabled={pending || picked.length === 0} className="w-full">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />} Thêm khóa cho học viên
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
