"use client";

import { Button } from "@/components/ui/button";

/** Nút submit hỏi lại trước khi chạy — cho thao tác xóa / hoàn tác khó */
export function ConfirmButton({
  message,
  ...props
}: React.ComponentProps<typeof Button> & { message: string }) {
  return (
    <Button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    />
  );
}
