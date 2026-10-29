import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Check, Clock, PlayCircle, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CourseCover } from "@/components/course-cover";
import { ReviewCard, Stars } from "@/components/review-card";
import { getPublishedOutline, outlineStats } from "@/lib/courses";
import { listCourseReviews } from "@/lib/content";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { lessonEmbedUrl } from "@/lib/video";
import { formatDuration, formatVND } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/khoa-hoc/[slug]">) {
  const { slug } = await params;
  const course = await getPublishedOutline(slug);
  return course
    ? { title: `${course.title} — Học viện Lê Bá Tùng`, description: course.subtitle ?? undefined }
    : {};
}

export default async function CourseDetailPage({ params }: PageProps<"/khoa-hoc/[slug]">) {
  const { slug } = await params;
  const course = await getPublishedOutline(slug);
  if (!course) notFound();
  const { lessons, total, totalSec } = outlineStats(course);
  const reviews = await listCourseReviews(course.id);
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  // Video giới thiệu = bài học thử đầu tiên
  const preview = lessons.find((l) => l.is_free_preview);
  let previewUrl: string | null = null;
  if (preview) {
    const { data } = await createAdminSupabase()
      .from("lessons")
      .select("bunny_video_id, youtube_id")
      .eq("id", preview.id)
      .single();
    if (data) previewUrl = lessonEmbedUrl(data);
  }

  // Đã mua chưa?
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  let enrolled = false;
  if (auth.user) {
    const { data } = await supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", course.id)
      .eq("status", "active")
      .maybeSingle();
    enrolled = !!data;
  }

  const discount =
    course.compare_price_vnd && course.compare_price_vnd > course.price_vnd
      ? Math.round((1 - course.price_vnd / course.compare_price_vnd) * 100)
      : 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <p className="text-primary text-sm font-semibold">{course.instructor}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{course.title}</h1>
          {course.subtitle && <p className="text-muted-foreground mt-2 text-lg">{course.subtitle}</p>}
          <div className="text-muted-foreground mt-4 flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5"><BookOpen className="size-4" /> {total} bài học</span>
            {totalSec > 0 && <span className="inline-flex items-center gap-1.5"><Clock className="size-4" /> {Math.round(totalSec / 60)} phút video</span>}
            <span>{course.access_days ? `Truy cập ${course.access_days} ngày` : "Học trọn đời"}</span>
            {reviews.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Stars value={avgRating} /> {avgRating.toFixed(1)} ({reviews.length} đánh giá)
              </span>
            )}
          </div>

          <div className="mt-6 overflow-hidden rounded-xl">
            {previewUrl ? (
              <div className="relative aspect-video bg-black">
                <iframe
                  src={previewUrl}
                  title={preview?.title}
                  className="absolute inset-0 size-full"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <CourseCover course={course} className="aspect-video" />
            )}
          </div>

          {course.description && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold">Giới thiệu khóa học</h2>
              <p className="text-muted-foreground mt-3 leading-relaxed whitespace-pre-line">{course.description}</p>
            </section>
          )}

          {course.outcomes && course.outcomes.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold">Bạn sẽ học được</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {course.outcomes.map((o) => (
                  <li key={o} className="flex gap-2 text-sm">
                    <Check className="text-success mt-0.5 size-4 shrink-0" /> {o}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Nội dung khóa học</h2>
            <div className="mt-3 space-y-4">
              {course.chapters.map((ch) => (
                <Card key={ch.id} className="overflow-hidden">
                  <p className="bg-muted/50 border-b px-4 py-2.5 text-sm font-semibold">{ch.title}</p>
                  <ul className="divide-y">
                    {ch.lessons.map((l) => (
                      <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        {l.is_free_preview ? (
                          <PlayCircle className="text-primary size-4 shrink-0" />
                        ) : (
                          <Lock className="text-muted-foreground size-4 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1">{l.title}</span>
                        {l.is_free_preview && <Badge tone="info">Học thử</Badge>}
                        {l.duration_seconds > 0 && <span className="text-muted-foreground tabular text-xs">{formatDuration(l.duration_seconds)}</span>}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </section>

          {reviews.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold">Học viên đánh giá</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="p-6">
            {discount > 0 && (
              <p className="text-muted-foreground text-sm">
                <span className="line-through">{formatVND(course.compare_price_vnd!)}</span>
                <Badge tone="danger" className="ml-2">-{discount}%</Badge>
              </p>
            )}
            <p className="mt-1 text-3xl font-bold">{course.price_vnd ? formatVND(course.price_vnd) : "Miễn phí"}</p>
            {enrolled ? (
              <Button asChild className="mt-5 h-12 w-full text-base">
                <Link href={`/hoc/${course.slug}`}>Vào học ngay</Link>
              </Button>
            ) : (
              <Button asChild className="mt-5 h-12 w-full text-base">
                <Link href={`/khoa-hoc/${course.slug}/mua`}>Đăng ký học</Link>
              </Button>
            )}
            <ul className="text-muted-foreground mt-5 space-y-2 text-sm">
              <li className="flex gap-2"><Check className="text-success size-4" /> {total} bài giảng video</li>
              <li className="flex gap-2"><Check className="text-success size-4" /> Thanh toán QR, mở khóa tự động</li>
              <li className="flex gap-2"><Check className="text-success size-4" /> Học trên điện thoại & máy tính</li>
            </ul>
          </Card>
        </aside>
      </div>
    </main>
  );
}
