import Link from "next/link";
import { PlayCircle, Clock, BookOpen, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getMyCourses, getStudent, resumeLesson } from "@/lib/learning";
import { CourseCover } from "@/components/course-cover";

export default async function MyCoursesPage() {
  const [currentStudent, myCourses] = await Promise.all([getStudent(), getMyCourses()]);
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

      {myCourses.length === 0 && (
        <Card className="p-8 text-center">
          <p className="font-medium">Bạn chưa có khóa học nào</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Nếu đã mua trên Edubit hoặc vừa chuyển khoản, hãy đăng nhập đúng email đã đăng ký hoặc liên hệ hỗ trợ.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild><Link href="/#khoa-hoc">Xem các khóa học</Link></Button>
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
