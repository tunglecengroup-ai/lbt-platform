import { cn } from "@/lib/utils";

export const inputClass =
  "bg-background focus:border-primary focus:ring-primary/20 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2";

/** Nhãn + ô nhập cho form admin */
export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-muted-foreground mt-1 block text-xs">{hint}</span>}
    </label>
  );
}
