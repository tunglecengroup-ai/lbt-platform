import { cn, initials } from "@/lib/utils";

const palettes = [
  "bg-info-soft text-info",
  "bg-violet-soft text-violet",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
  "bg-danger-soft text-danger",
];

/** Màu avatar suy ra từ tên -> ổn định giữa server và client, không dùng random */
export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  const palette = palettes[hash % palettes.length];

  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        palette,
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
