import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  barClassName,
  label,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  label?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("bg-muted h-2 w-full overflow-hidden rounded-full", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `Tiến độ ${clamped}%`}
    >
      <div
        className={cn("bg-primary h-full rounded-full transition-[width] duration-300", barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
