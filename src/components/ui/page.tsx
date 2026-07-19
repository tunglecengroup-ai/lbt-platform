import { cn } from "@/lib/utils";

/** Vùng nội dung chính của mỗi trang dashboard */
export function PageBody({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      className={cn("mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8", className)}
      {...props}
    />
  );
}

export function SectionTitle({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-4", className)}>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}
