import { Search, Bell } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="bg-background/80 sticky top-0 z-20 hidden items-center gap-4 border-b px-8 py-4 backdrop-blur lg:flex">
      <div className="flex-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-0.5 text-sm">{subtitle}</p>}
      </div>

      <div className="relative w-64">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          type="search"
          placeholder="Tìm học viên, đơn, lead…"
          className="bg-card focus:border-primary focus:ring-primary/20 h-10 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus:ring-2"
        />
      </div>

      <button
        className="hover:bg-muted relative inline-flex size-10 items-center justify-center rounded-md"
        aria-label="Thông báo"
      >
        <Bell className="size-5" />
        <span className="bg-danger absolute top-2 right-2 size-2 rounded-full ring-2 ring-[hsl(var(--background))]" />
      </button>

      <ThemeToggle />

      <div className="flex items-center gap-3 border-l pl-4">
        <Avatar name="Lê Bá Tùng" />
        <div className="leading-tight">
          <p className="text-sm font-medium">Lê Bá Tùng</p>
          <p className="text-muted-foreground text-xs">Chủ học viện</p>
        </div>
      </div>
    </header>
  );
}

/** Tiêu đề trang cho mobile (topbar desktop bị ẩn) */
export function MobileHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 lg:hidden">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
    </div>
  );
}
