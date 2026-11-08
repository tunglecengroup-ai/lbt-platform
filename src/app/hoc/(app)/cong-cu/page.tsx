import Link from "next/link";
import { PenLine, Gauge, Store, LayoutTemplate, Lock, Crown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getStudent } from "@/lib/learning";
import { toolAccess, usedToday, isAiConfigured } from "@/lib/ai";
import { TOOLS } from "@/lib/ai-tools";
import { marketingHref } from "@/lib/site";

export const metadata = { title: "Công cụ AI quảng cáo — Học viện Lê Bá Tùng" };

const ICONS = { "viet-content": PenLine, "cham-diem-quang-cao": Gauge, "cham-diem-fanpage": Store, "tao-landing": LayoutTemplate } as const;

export default async function ToolsHome() {
  const student = await getStudent();
  const [access, used] = await Promise.all([toolAccess(student.id), usedToday(student.id)]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Công cụ AI hỗ trợ làm quảng cáo</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Trợ lý được huấn luyện theo cách Lê Bá Tùng làm quảng cáo cho thị trường Việt Nam.
        {access.allowed && ` Hôm nay còn ${Math.max(0, access.quota - used)}/${access.quota} lượt.`}
      </p>

      {!isAiConfigured() && (
        <p className="bg-warning-soft text-warning mt-4 rounded-md px-4 py-2 text-sm">Bộ công cụ đang được bật, vui lòng quay lại sau.</p>
      )}

      {!access.allowed && (
        <Card className="mt-6 flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center">
          <Lock className="text-muted-foreground size-8 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Dành cho học viên đang học và thành viên LBT Member</p>
            <p className="text-muted-foreground text-sm">Đăng ký một khóa học hoặc gói thành viên để dùng toàn bộ công cụ.</p>
          </div>
          <Button asChild><Link href={marketingHref("/thanh-vien")}><Crown className="size-4" /> Xem gói thành viên</Link></Button>
        </Card>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {TOOLS.map((t) => {
          const Icon = ICONS[t.key];
          return (
            <Link key={t.key} href={`/hoc/cong-cu/${t.key}`} className="group">
              <Card className="group-hover:border-primary/40 h-full p-5 transition-colors">
                <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg"><Icon className="size-5" /></span>
                <p className="mt-3 font-semibold group-hover:underline">{t.title}</p>
                <p className="text-muted-foreground mt-1 text-sm">{t.short}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
