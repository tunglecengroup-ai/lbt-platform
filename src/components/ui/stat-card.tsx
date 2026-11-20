import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  hint,
  href,
  active,
}: {
  /** Bấm vào thẻ thì mở link này (vd danh sách tương ứng) */
  href?: string;
  /** Thẻ đang được chọn (đang lọc theo thẻ này) */
  active?: boolean;
  label: string;
  value: string;
  delta?: number;
  icon: LucideIcon;
  hint?: string;
}) {
  const up = (delta ?? 0) >= 0;
  const card = (
    <Card className={cn("p-5", href && "hover:border-primary/50 h-full transition-colors hover:shadow-md", active && "border-primary ring-primary/20 ring-2")}>
      <div className="flex items-start justify-between">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg">
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className="tabular mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              up ? "text-success" : "text-danger",
            )}
          >
            {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(delta)}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </Card>
  );
  return href ? (
    <Link href={href} className="block" title="Bấm để xem danh sách">
      {card}
    </Link>
  ) : (
    card
  );
}
