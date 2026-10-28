"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/components/nav";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {navItems.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-[18px] shrink-0" strokeWidth={2} />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="bg-danger inline-flex size-5 items-center justify-center rounded-full text-[11px] font-semibold text-white">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg font-bold">
        LBT
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold">LBT Platform</p>
        <p className="text-muted-foreground text-xs">Học viện Lê Bá Tùng</p>
      </div>
    </div>
  );
}

function UpgradeCard() {
  return (
    <div className="bg-primary/5 border-primary/15 mx-3 mb-3 rounded-lg border p-3">
      <div className="text-primary flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4" /> Trợ lý AI
      </div>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        Hỏi bất kỳ số liệu nào bằng tiếng Việt, AI trả lời ngay.
      </p>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Topbar mobile */}
      <div className="bg-card sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 lg:hidden">
        <Brand />
        <button
          onClick={() => setOpen(true)}
          aria-label="Mở menu"
          className="hover:bg-muted inline-flex size-10 items-center justify-center rounded-md"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* Sidebar desktop */}
      <aside className="bg-card sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r lg:flex">
        <Brand />
        <NavLinks />
        <UpgradeCard />
        <div className="border-t p-3">
          <a
            href="/api/logout"
            className="text-muted-foreground hover:bg-muted flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium"
          >
            <LogOut className="size-[18px]" /> Đăng xuất
          </a>
        </div>
      </aside>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="bg-card absolute inset-y-0 left-0 flex w-72 flex-col">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                aria-label="Đóng menu"
                className="hover:bg-muted inline-flex size-10 items-center justify-center rounded-md"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <UpgradeCard />
          </div>
        </div>
      )}
    </>
  );
}
