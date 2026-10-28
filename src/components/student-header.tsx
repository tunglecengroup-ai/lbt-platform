import Link from "next/link";
import { GraduationCap, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { getStudent } from "@/lib/learning";

export async function StudentHeader() {
  const currentStudent = await getStudent();
  return (
    <header className="bg-card/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg font-bold">
            LBT
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Học viện Lê Bá Tùng</p>
            <p className="text-muted-foreground hidden text-xs sm:block">Khu học tập</p>
          </div>
        </Link>

        <nav className="ml-4 hidden sm:flex">
          <Link
            href="/hoc"
            className="text-foreground hover:bg-muted inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
          >
            <GraduationCap className="size-4" /> Khóa của tôi
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <div className="flex items-center gap-2.5 border-l pl-3">
            <Avatar name={currentStudent.name} />
            <div className="hidden leading-tight md:block">
              <p className="text-sm font-medium">{currentStudent.name}</p>
              <p className="text-muted-foreground text-xs">Học viên</p>
            </div>
            <a
              href="/api/hoc/logout"
              aria-label="Đăng xuất"
              className="text-muted-foreground hover:bg-muted hover:text-foreground ml-1 inline-flex size-9 items-center justify-center rounded-md"
            >
              <LogOut className="size-[18px]" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
