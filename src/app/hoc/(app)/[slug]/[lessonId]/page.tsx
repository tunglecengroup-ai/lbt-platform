import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  CheckCircle2,
  Circle,
  Play,
  FileText,
  Download,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarkComplete } from "@/components/lesson-actions";
import { formatDuration, cn } from "@/lib/utils";
import { getCourse, findLesson } from "@/lib/lms-data";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  const found = findLesson(course, lessonId);
  if (!found) notFound();

  const { lesson, chapterTitle, index, prev, next, total } = found;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <Link
        href={`/hoc/${slug}`}
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="size-4" /> {course.title}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Cột trái: video + nội dung */}
        <div className="min-w-0">
          {/* Trình phát video (placeholder — nhúng YouTube unlisted khi nối thật) */}
          <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-950">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="flex size-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur">
                <Play className="size-7 translate-x-0.5 fill-white text-white" />
              </span>
              <p className="px-6 text-center text-sm font-medium text-white/70">{lesson.title}</p>
              <span className="text-xs text-white/40">
                {lesson.youtubeId ? "Video bài giảng" : "Video nhúng YouTube (khi nối thật)"}
              </span>
            </div>
            <span className="tabular absolute right-3 bottom-3 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
              {formatDuration(lesson.durationSec)}
            </span>
          </div>

          {/* Thông tin bài */}
          <div className="mt-5">
            <p className="text-muted-foreground text-xs font-medium">
              {chapterTitle} · Bài {index + 1}/{total}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{lesson.title}</h1>
              {lesson.isFreePreview && <Badge tone="info">Học thử miễn phí</Badge>}
            </div>
          </div>

          {/* Hành động */}
          <div className="mt-5 flex flex-wrap items-center gap-3 border-y py-4">
            <MarkComplete initialCompleted={lesson.completed} />
            <div className="ml-auto flex items-center gap-2">
              {prev ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/hoc/${slug}/${prev.id}`}>
                    <ChevronLeft className="size-4" /> Bài trước
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft className="size-4" /> Bài trước
                </Button>
              )}
              {next ? (
                <Button asChild size="sm">
                  <Link href={`/hoc/${slug}/${next.id}`}>
                    Bài tiếp <ChevronRight className="size-4" />
                  </Link>
                </Button>
              ) : (
                <Button size="sm" disabled>
                  Bài tiếp <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Tài liệu đính kèm (Drive) */}
          {lesson.resources && lesson.resources.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-2 text-sm font-semibold">Tài liệu bài học</h2>
              <div className="space-y-2">
                {lesson.resources.map((r) => (
                  <a
                    key={r.label}
                    href={r.href}
                    className="hover:border-primary/40 flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors"
                  >
                    <FileText className="text-primary size-4 shrink-0" />
                    <span className="flex-1">{r.label}</span>
                    <Download className="text-muted-foreground size-4" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cột phải: mục lục */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-semibold">Nội dung khóa học</p>
            </div>
            <div className="scrollbar-thin max-h-[70vh] overflow-y-auto">
              {course.chapters.map((chapter) => (
                <div key={chapter.id}>
                  <p className="bg-muted/50 text-muted-foreground px-4 py-2 text-xs font-semibold">
                    {chapter.title}
                  </p>
                  {chapter.lessons.map((l) => {
                    const active = l.id === lesson.id;
                    return (
                      <Link
                        key={l.id}
                        href={`/hoc/${slug}/${l.id}`}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                          active
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted/50",
                        )}
                      >
                        {l.completed ? (
                          <CheckCircle2 className="text-success size-4 shrink-0" />
                        ) : active ? (
                          <PlayCircle className="text-primary size-4 shrink-0" />
                        ) : (
                          <Circle className="text-muted-foreground size-4 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{l.title}</span>
                        <span className="text-muted-foreground tabular shrink-0 text-xs">
                          {formatDuration(l.durationSec)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </main>
  );
}
