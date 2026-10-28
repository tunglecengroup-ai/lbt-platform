import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  CheckCircle2,
  Circle,
  Lock,
  FileText,
  Download,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarkComplete } from "@/components/lesson-actions";
import { formatDuration, cn } from "@/lib/utils";
import { flatLessons, getLessonContent, getStudentCourse } from "@/lib/learning";

export default async function LessonPage({ params }: PageProps<"/hoc/[slug]/[lessonId]">) {
  const { slug, lessonId } = await params;
  const course = await getStudentCourse(slug);
  if (!course) notFound();

  const flat = flatLessons(course);
  const index = flat.findIndex((x) => x.lesson.id === lessonId);
  if (index === -1) notFound();
  const { lesson, chapterTitle } = flat[index];
  const prev = flat[index - 1]?.lesson;
  const next = flat[index + 1]?.lesson;

  const content = await getLessonContent(lesson.id);
  const canOpen = (l: { is_free_preview: boolean }) => course.enrolled || l.is_free_preview;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <Link
        href={`/hoc/${slug}`}
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="size-4" /> {course.title}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-950">
            {content.allowed && content.embedUrl ? (
              <iframe
                src={content.embedUrl}
                title={lesson.title}
                className="absolute inset-0 size-full"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                {content.allowed ? (
                  <p className="text-sm text-white/70">Bài này chưa có video.</p>
                ) : (
                  <>
                    <span className="flex size-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                      <Lock className="size-6 text-white" />
                    </span>
                    <p className="text-sm font-medium text-white/80">Bài học dành cho học viên đã đăng ký</p>
                    <Button asChild size="sm">
                      <Link href={`/khoa-hoc/${slug}/mua`}>Đăng ký để mở khóa</Link>
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-5">
            <p className="text-muted-foreground text-xs font-medium">
              {chapterTitle} · Bài {index + 1}/{flat.length}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{lesson.title}</h1>
              {lesson.is_free_preview && <Badge tone="info">Học thử miễn phí</Badge>}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-y py-4">
            {content.allowed && (
              <MarkComplete
                key={lesson.id}
                lessonId={lesson.id}
                courseId={course.id}
                slug={slug}
                initialCompleted={course.completed.has(lesson.id)}
                nextHref={next && canOpen(next) ? `/hoc/${slug}/${next.id}` : undefined}
              />
            )}
            <div className="ml-auto flex items-center gap-2">
              {prev ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/hoc/${slug}/${prev.id}`}><ChevronLeft className="size-4" /> Bài trước</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled><ChevronLeft className="size-4" /> Bài trước</Button>
              )}
              {next ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/hoc/${slug}/${next.id}`}>Bài tiếp <ChevronRight className="size-4" /></Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>Bài tiếp <ChevronRight className="size-4" /></Button>
              )}
            </div>
          </div>

          {content.allowed && content.content && (
            <div className="text-muted-foreground mt-6 text-sm leading-relaxed whitespace-pre-line">{content.content}</div>
          )}

          {content.allowed && content.resources.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-2 text-sm font-semibold">Tài liệu bài học</h2>
              <div className="space-y-2">
                {content.resources.map((r) => (
                  <a key={r.href} href={r.href} target="_blank" rel="noopener noreferrer"
                    className="hover:border-primary/40 flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors">
                    <FileText className="text-primary size-4 shrink-0" />
                    <span className="flex-1">{r.label}</span>
                    <Download className="text-muted-foreground size-4" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-semibold">Nội dung khóa học</p>
              <p className="text-muted-foreground mt-0.5 text-xs">Hoàn thành {course.done}/{course.total} bài · {course.progress}%</p>
            </div>
            <div className="scrollbar-thin max-h-[70vh] overflow-y-auto">
              {course.chapters.map((chapter) => (
                <div key={chapter.id}>
                  <p className="bg-muted/50 text-muted-foreground px-4 py-2 text-xs font-semibold">{chapter.title}</p>
                  {chapter.lessons.map((l) => {
                    const active = l.id === lesson.id;
                    return (
                      <Link
                        key={l.id}
                        href={`/hoc/${slug}/${l.id}`}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                          active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50",
                        )}
                      >
                        {course.completed.has(l.id) ? (
                          <CheckCircle2 className="text-success size-4 shrink-0" />
                        ) : !canOpen(l) ? (
                          <Lock className="text-muted-foreground size-4 shrink-0" />
                        ) : active ? (
                          <PlayCircle className="text-primary size-4 shrink-0" />
                        ) : (
                          <Circle className="text-muted-foreground size-4 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{l.title}</span>
                        <span className="text-muted-foreground tabular shrink-0 text-xs">{formatDuration(l.duration_seconds)}</span>
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
