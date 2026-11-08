"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

// Trạng thái sáng/tối đọc thẳng từ class .dark trên <html> (script đầu trang đã đặt trước khi hydrate)
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const isDark = () => document.documentElement.classList.contains("dark");

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggle() {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    listeners.forEach((l) => l());
  }

  return (
    <button
      onClick={toggle}
      className="hover:bg-muted inline-flex size-10 items-center justify-center rounded-md transition-colors"
      aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
