import Link from "next/link";
import { BookOpen, Clock, ShieldCheck, Zap, Infinity as InfinityIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CourseCover } from "@/components/course-cover";
import { listPublishedCourses } from "@/lib/courses";
import { formatVND } from "@/lib/utils";

export const metadata = {
  title: "Học viện Lê Bá Tùng — Khóa học Facebook Ads & Marketing thực chiến",
  description: "Khóa học online quảng cáo Facebook, marketing thực chiến từ chuyên gia 10 năm. Học mọi lúc, kích hoạt tự động sau khi chuyển khoản.",
};

const perks = [
  { icon: Zap, title: "Kích hoạt tức thì", text: "Chuyển khoản xong, hệ thống tự mở khóa trong vài giây." },
  { icon: InfinityIcon, title: "Học mọi lúc", text: "Xem lại không giới hạn trên điện thoại và máy tính." },
  { icon: ShieldCheck, title: "Thực chiến", text: "Kiến thức đúc kết từ 10 năm chạy quảng cáo thật." },
];

export default async function HomePage() {
  const courses = await listPublishedCourses();

  return (
    <main>
      <section className="border-b bg-gradient-to-b from-primary/10 to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <p className="text-primary text-sm font-semibold">Học viện Lê Bá Tùng</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
            Học quảng cáo & marketing online từ người làm thật
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-base md:text-lg">
            Video bài bản, làm theo từng bước. Thanh toán bằng mã QR, vào học ngay không cần chờ.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="h-11 px-6">
              <Link href="#khoa-hoc">Xem các khóa học</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-6">
              <Link href="/hoc">Tôi đã có tài khoản</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-3 md:px-6">
        {perks.map((p) => (
          <div key={p.title} className="flex gap-3">
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <p.icon className="size-5" />
            </span>
            <div>
              <p className="font-semibold">{p.title}</p>
              <p className="text-muted-foreground text-sm">{p.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section id="khoa-hoc" className="mx-auto max-w-6xl scroll-mt-20 px-4 md:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Khóa học</h2>
        {courses.length === 0 ? (
          <p className="text-muted-foreground mt-4 text-sm">Chưa có khóa học nào được mở bán.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <Card key={c.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
                <Link href={`/khoa-hoc/${c.slug}`}>
                  <CourseCover course={c} className="aspect-video" />
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-semibold tracking-tight">
                    <Link href={`/khoa-hoc/${c.slug}`} className="hover:text-primary">{c.title}</Link>
                  </h3>
                  {c.subtitle && <p className="text-muted-foreground mt-1 text-sm">{c.subtitle}</p>}
                  <div className="text-muted-foreground mt-3 flex items-center gap-4 text-xs">
                    <span className="inline-flex items-center gap-1"><BookOpen className="size-3.5" /> {c.lessonCount} bài</span>
                    <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {Math.round(c.totalSec / 60)} phút</span>
                  </div>
                  <div className="flex-1" />
                  <div className="mt-4 flex items-end justify-between gap-2">
                    <div>
                      {c.compare_price_vnd && c.compare_price_vnd > c.price_vnd && (
                        <p className="text-muted-foreground text-xs line-through">{formatVND(c.compare_price_vnd)}</p>
                      )}
                      <p className="text-lg font-bold">{c.price_vnd ? formatVND(c.price_vnd) : "Miễn phí"}</p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/khoa-hoc/${c.slug}`}>Xem chi tiết</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
