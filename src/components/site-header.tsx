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

const links = [
  { href: "/#khoa-hoc", label: "Khóa học" },
  { href: "/blog", label: "Blog" },
  { href: "/p/le-ba-tung-la-ai", label: "Về Lê Bá Tùng", className: "hidden md:block" },
  { href: "/p/lien-he", label: "Liên hệ", className: "hidden md:block" },
  { href: "/hoc/kich-hoat", label: "Mã kích hoạt", className: "hidden lg:block" },
];

export async function SiteHeader() {
  const loggedIn = await isLoggedIn();
  return (
    <header className="bg-card/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 md:gap-4 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg font-bold">
            LBT
          </span>
          <span className="hidden text-sm font-semibold sm:inline">Học viện Lê Bá Tùng</span>
        </Link>
        <nav className="scrollbar-thin ml-2 flex min-w-0 overflow-x-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-muted-foreground hover:text-foreground shrink-0 rounded-md px-2.5 py-2 text-sm font-medium ${l.className ?? ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
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
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3 md:px-6">
        <div>
          <p className="font-semibold">Học viện Lê Bá Tùng</p>
          <p className="text-muted-foreground mt-2">Chuyên gia quảng cáo & marketing online — 10 năm thực chiến.</p>
        </div>
        <div className="text-muted-foreground space-y-1.5">
          <p className="text-foreground font-semibold">Liên hệ</p>
          <p>Hotline/Zalo: <a href="tel:0869126363" className="hover:text-foreground">0869 126 363</a></p>
          <p><a href="https://www.facebook.com/lebatung.vn1" target="_blank" rel="noopener" className="hover:text-foreground">Facebook</a> · <a href="https://www.youtube.com/@lebatungofficial" target="_blank" rel="noopener" className="hover:text-foreground">YouTube</a> · <a href="https://www.tiktok.com/@lebatung.com" target="_blank" rel="noopener" className="hover:text-foreground">TikTok</a></p>
        </div>
        <div className="text-muted-foreground space-y-1.5">
          <p className="text-foreground font-semibold">Học viên</p>
          <p><Link href="/hoc" className="hover:text-foreground">Vào học</Link></p>
          <p><Link href="/hoc/kich-hoat" className="hover:text-foreground">Kích hoạt khóa học bằng mã</Link></p>
          <p><Link href="/blog" className="hover:text-foreground">Blog</Link></p>
        </div>
      </div>
      <p className="text-muted-foreground border-t py-4 text-center text-xs">© {new Date().getFullYear()} Học viện Lê Bá Tùng</p>
    </footer>
  );
}
