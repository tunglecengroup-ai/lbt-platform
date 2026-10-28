import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  PlayCircle,
  CheckCircle2,
  Clock,
  BookOpen,
  Circle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { getStudentCourse, resumeLesson } from "@/lib/learning";
import { CourseCover } from "@/components/course-cover";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getStudentCourse(slug);
  if (!course) notFound();

  const { total, done, totalSec, progress } = course;
  const resume = resumeLesson(course);
  const startHref = resume ? `/hoc/${course.slug}/${resume.id}` : `/hoc/${course.slug}`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <Link
        href="/hoc"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="size-4" /> Khóa của tôi
      </Link>

      {/* Header khóa */}
      <CourseCover course={course} className="rounded-xl p-6 md:p-8">
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative">
          <p className="text-sm font-medium text-white/85">{course.instructor}</p>
          <h1 className="mt-1 text-2xl font-semibold text-white md:text-3xl">{course.title}</h1>
          <p className="mt-2 max-w-xl text-sm text-white/85">{course.subtitle}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/90">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="size-4" /> {total} bài học
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" /> {Math.round(totalSec / 60)} phút
            </span>
          </div>
        </div>
      </CourseCover>

      {!course.enrolled && (
        <Card className="border-primary/30 bg-primary/5 mt-4 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm">Bạn đang xem thử. Đăng ký khóa học để mở toàn bộ bài giảng.</p>
          <Button asChild><Link href={`/khoa-hoc/${course.slug}/mua`}>Đăng ký học</Link></Button>
        </Card>
      )}

      {/* Thanh tiến độ + tiếp tục */}
      <Card className="mt-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Tiến độ: <span className="tabular text-foreground font-medium">{done}/{total}</span> bài
            </span>
            <span className="tabular font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
        <Button asChild className="sm:w-auto">
          <Link href={startHref}>
            <PlayCircle className="size-4" />
            {done === 0 ? "Bắt đầu học" : "Tiếp tục học"}
          </Link>
        </Button>
      </Card>

      {/* Danh sách chương */}
      <div className="mt-8 space-y-6">
        {course.chapters.map((chapter, ci) => {
          const chDone = chapter.lessons.filter((l) => course.completed.has(l.id)).length;
          return (
            <div key={chapter.id}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-tight">{chapter.title}</h2>
                <span className="text-muted-foreground tabular text-xs">
                  {chDone}/{chapter.lessons.length}
                </span>
              </div>
              <Card className="divide-y overflow-hidden">
                {chapter.lessons.map((lesson, li) => (
                  <Link
                    key={lesson.id}
                    href={`/hoc/${course.slug}/${lesson.id}`}
                    className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors"
                  >
                    <span className="shrink-0">
                      {course.completed.has(lesson.id) ? (
                        <CheckCircle2 className="text-success size-5" />
                      ) : (
                        <Circle className="text-muted-foreground size-5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        <span className="text-muted-foreground tabular mr-1.5">
                          {ci + 1}.{li + 1}
                        </span>
                        {lesson.title}
                      </p>
                    </div>
                    {lesson.is_free_preview && (
                      <Badge tone="info" className="hidden sm:inline-flex">Học thử</Badge>
                    )}
                    <span className="text-muted-foreground tabular hidden text-xs sm:inline">
                      {formatDuration(lesson.duration_seconds)}
                    </span>
                    <PlayCircle className="text-muted-foreground size-4 shrink-0" />
                  </Link>
                ))}
              </Card>
            </div>
          );
        })}
      </div>
    </main>
  );
}
