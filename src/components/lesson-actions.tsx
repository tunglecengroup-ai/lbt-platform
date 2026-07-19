"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Nút đánh dấu hoàn thành bài học.
 * BẢN DEMO: chỉ đổi trạng thái tại chỗ (state cục bộ).
 * Khi nối Supabase: ghi vào bảng progress (user_id + lesson_id, completed_at).
 */
export function MarkComplete({ initialCompleted }: { initialCompleted: boolean }) {
  const [done, setDone] = useState(initialCompleted);

  return (
    <Button
      variant={done ? "outline" : "primary"}
      onClick={() => setDone((d) => !d)}
      className={done ? "text-success" : undefined}
    >
      {done ? (
        <>
          <CheckCircle2 className="size-4" /> Đã hoàn thành
        </>
      ) : (
        <>
          <Circle className="size-4" /> Đánh dấu hoàn thành
        </>
      )}
    </Button>
  );
}
