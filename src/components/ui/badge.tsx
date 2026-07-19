import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/mock-data";

const toneClass: Record<Tone, string> = {
  info: "bg-info-soft text-info border-info/20",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  violet: "bg-violet-soft text-violet border-violet/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Chấm tròn đứng trước nhãn trạng thái — màu không phải tín hiệu duy nhất */
export function Dot({ className }: { className?: string }) {
  return <span className={cn("size-1.5 rounded-full bg-current", className)} />;
}
