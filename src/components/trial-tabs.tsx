"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatVND } from "@/lib/utils";
import type { TrialCourse } from "@/lib/trial-courses";

const tabName = (t: string) =>
  /\bAI\b/i.test(t) ? "AI" : /youtube/i.test(t) ? "YouTube" : /facebook/i.test(t) ? "Facebook Ads" : t;

/**
 * Mục HỌC THỬ trang chủ: mỗi tab 1 khóa — video bài thử, danh sách bài mở miễn phí + bài khóa,
 * nút đăng ký (họ tên, SĐT, email) rồi vào thẳng khóa học thử.
 */
export function TrialTabs({ courses, registerBase, loginBase }: { courses: TrialCourse[]; registerBase: string; loginBase: string }) {
  const [active, setActive] = useState(0);
  const c = courses[active];
  if (!c) return null;
  const from = encodeURIComponent(`/hoc/${c.slug}`);
  const shownLocked = c.locked.slice(0, Math.max(3, 8 - Math.min(c.free.length, 5)));

  return (
    <div className="mt-8">
      {courses.length > 1 && (
        <div role="tablist" className="bg-muted mx-auto inline-flex rounded-full p-1">
          {courses.map((x, i) => (
            <button
              key={x.slug}
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                i === active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Học thử {tabName(x.title)}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 text-left lg:grid-cols-[1.4fr_1fr]">
        <div className="bg-card aspect-video w-full overflow-hidden rounded-xl border shadow-lg">
          {c.videoId ? (
            <iframe
              key={c.videoId}
              src={`https://www.youtube-nocookie.com/embed/${c.videoId}?rel=0&modestbranding=1`}
              title={`Học thử ${c.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="size-full"
            />
          ) : (
            <div className="from-primary/20 to-primary/5 flex size-full flex-col items-center justify-center gap-3 bg-gradient-to-br">
              <PlayCircle className="text-primary size-12" />
              <p className="font-semibold">Đăng ký để xem bài học thử</p>
            </div>
          )}
        </div>

        <div className="bg-card flex flex-col rounded-xl border p-5 shadow-sm">
          <p className="text-primary text-xs font-semibold uppercase">Khóa {tabName(c.title)}</p>
          <h3 className="mt-1 text-lg font-bold">{c.title}</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            <b className="text-foreground">{c.free.length} bài học thử miễn phí</b> · {c.locked.length} bài mở khi đăng ký khóa
          </p>
          <ul className="mt-4 flex-1 space-y-1.5 text-sm">
            {c.free.slice(0, 5).map((l) => (
              <li key={l.title} className="flex gap-2"><PlayCircle className="text-primary mt-0.5 size-4 shrink-0" /> <span className="line-clamp-1">{l.title}</span></li>
            ))}
            {shownLocked.map((l) => (
              <li key={l.title} className="text-muted-foreground flex gap-2"><Lock className="mt-0.5 size-4 shrink-0" /> <span className="line-clamp-1">{l.title}</span></li>
            ))}
            {c.locked.length > shownLocked.length && <li className="text-muted-foreground pl-6 text-xs">… và {c.locked.length - shownLocked.length} bài khác</li>}
          </ul>
          <Button asChild className="mt-5 h-11 w-full">
            <Link href={`${registerBase}?from=${from}`}>Đăng ký học thử miễn phí</Link>
          </Button>
          <p className="text-muted-foreground mt-2 text-center text-xs">
            Chỉ cần họ tên, số điện thoại, email · Đã có tài khoản? <Link href={`${loginBase}?from=${from}`} className="text-primary font-medium hover:underline">Vào học thử</Link>
          </p>
          <p className="mt-3 border-t pt-3 text-center text-sm">
            Mở trọn khóa:{" "}
            {c.comparePrice && c.comparePrice > c.price && <span className="text-muted-foreground mr-1 line-through">{formatVND(c.comparePrice)}</span>}
            <b>{formatVND(c.price)}</b>{" "}
            <Link href={`/khoa-hoc/${c.slug}`} className="text-primary font-medium hover:underline">Xem chi tiết</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
