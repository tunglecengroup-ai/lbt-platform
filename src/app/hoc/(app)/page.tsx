import Link from "next/link";
import { PlayCircle, Clock, BookOpen, CheckCircle2, Crown, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getMyCourses, getStudent, getStudentId, resumeLesson } from "@/lib/learning";
import { CourseCover } from "@/components/course-cover";
import { getActiveMembership } from "@/lib/membership";
import { marketingHref } from "@/lib/site";
import { formatDate } from "@/lib/utils";

export default async function MyCoursesPage() {
  const { id } = await getStudentId();
  const [currentStudent, myCourses, membership] = await Promise.all([getStudent(), getMyCourses(), getActiveMembership(id)]);
  const firstName = currentStudent.name.split(" ").pop();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Xin chào, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tiếp tục hành trình học của bạn — {myCourses.length} khóa đang tham gia.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {membership ? (
          <Card className="flex items-center gap-3 border-warning/40 p-4">
            <Crown className="text-warning size-6 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">{membership.plan.name}</p>
              <p className="text-muted-foreground">Thành viên đến {formatDate(membership.expires_at)} — học tất cả khóa trong gói.</p>
            </div>
          </Card>
        ) : (
          <Card className="flex items-center gap-3 p-4">
            <Crown className="text-warning size-6 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Lên LBT Member</p>
              <p className="text-muted-foreground">Học trọn bộ khóa + công cụ AI trong 12 tháng.</p>
            </div>
            <Button asChild size="sm" variant="outline"><Link href={marketingHref("/thanh-vien")}>Xem gói</Link></Button>
          </Card>
        )}
        <Card className="flex items-center gap-3 p-4">
          <Sparkles className="text-primary size-6 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Công cụ AI quảng cáo</p>
            <p className="text-muted-foreground">Viết content, chấm điểm quảng cáo & fanpage, tạo landing.</p>
          </div>
          <Button asChild size="sm"><Link href="/hoc/cong-cu">Mở</Link></Button>
        </Card>
      </div>

      {myCourses.length === 0 && (
        <Card className="p-8 text-center">
          <p className="font-medium">Bạn chưa có khóa học nào</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Nếu đã mua trên Edubit hoặc vừa chuyển khoản, hãy đăng nhập đúng email đã đăng ký hoặc liên hệ hỗ trợ.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild><Link href={marketingHref("/#khoa-hoc")}>Xem các khóa học</Link></Button>
            <Button asChild variant="outline"><Link href="/hoc/kich-hoat">Tôi có mã kích hoạt</Link></Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {myCourses.map((course) => {
          const { total, done, totalSec, progress } = course;
          const resume = resumeLesson(course);
          const finished = progress === 100;
          return (
            <Card key={course.slug} className="flex flex-col overflow-hidden">
              <Link href={`/hoc/${course.slug}`} className="block">
              <CourseCover course={course} className="h-36">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/0" />
                <div className="absolute bottom-3 left-4 right-4">
                  <p className="text-xs font-medium text-white/80">{course.instructor}</p>
                  <h2 className="mt-0.5 text-lg font-semibold text-white">{course.title}</h2>
                </div>
                {finished && (
                  <div className="absolute top-3 right-3">
                    <Badge tone="success" className="bg-white/90 dark:bg-black/40">
                      <CheckCircle2 className="size-3.5" /> Hoàn thành
                    </Badge>
                  </div>
                )}
              </CourseCover>
              </Link>

              <div className="flex flex-1 flex-col p-5">
                <p className="text-muted-foreground text-sm">{course.subtitle}</p>

                <div className="text-muted-foreground mt-3 flex items-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="size-3.5" /> {total} bài
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" /> {Math.round(totalSec / 60)} phút
                  </span>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Đã học <span className="tabular text-foreground font-medium">{done}/{total}</span> bài
                    </span>
                    <span className="tabular font-semibold">{progress}%</span>
                  </div>
                  <Progress value={progress} barClassName={finished ? "bg-success" : undefined} />
                </div>

                <div className="mt-5 flex-1" />

                <Button asChild className="w-full">
                  <Link href={resume ? `/hoc/${course.slug}/${resume.id}` : `/hoc/${course.slug}`}>
                    <PlayCircle className="size-4" />
                    {done === 0 ? "Bắt đầu học" : finished ? "Xem lại" : "Tiếp tục học"}
                  </Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
