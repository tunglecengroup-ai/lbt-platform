"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setLessonComplete } from "@/app/hoc/actions";

/** Nút đánh dấu hoàn thành bài học — ghi vào bảng progress. Hoàn thành thì tự sang bài tiếp. */
export function MarkComplete({
  lessonId,
  courseId,
  slug,
  initialCompleted,
  nextHref,
}: {
  lessonId: string;
  courseId: string;
  slug: string;
  initialCompleted: boolean;
  nextHref?: string;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initialCompleted);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const value = !done;
    setDone(value);
    startTransition(async () => {
      try {
        await setLessonComplete(lessonId, courseId, slug, value);
        if (value && nextHref) router.push(nextHref);
      } catch {
        setDone(!value);
      }
    });
  }

  return (
    <Button variant={done ? "outline" : "primary"} onClick={toggle} disabled={pending} className={done ? "text-success" : undefined}>
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : done ? (
        <CheckCircle2 className="size-4" />
      ) : (
        <Circle className="size-4" />
      )}
      {done ? "Đã hoàn thành" : nextHref ? "Hoàn thành & học bài tiếp" : "Đánh dấu hoàn thành"}
    </Button>
  );
}
