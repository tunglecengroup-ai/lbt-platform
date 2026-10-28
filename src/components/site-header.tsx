import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";

async function isLoggedIn() {
  if (!isSupabaseConfigured) return false;
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  return !!data.user;
}

export async function SiteHeader() {
  const loggedIn = await isLoggedIn();
  return (
    <header className="bg-card/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg font-bold">
            LBT
          </span>
          <span className="text-sm font-semibold">Học viện Lê Bá Tùng</span>
        </Link>
        <nav className="ml-4 hidden sm:flex">
          <Link href="/#khoa-hoc" className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm font-medium">
            Khóa học
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/hoc">
              <GraduationCap className="size-4" />
              {loggedIn ? "Khóa của tôi" : "Vào học"}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm md:flex-row md:justify-between md:px-6">
        <p>© {new Date().getFullYear()} Học viện Lê Bá Tùng</p>
        <p>Chuyên gia quảng cáo & marketing online — 10 năm thực chiến</p>
      </div>
    </footer>
  );
}
