import { Plus, Star, Clock, PlayCircle, Users } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatVND, formatNumber } from "@/lib/utils";
import { courses } from "@/lib/mock-data";
import { courseStatus } from "@/lib/status";

export default function CoursesPage() {
  return (
    <>
      <Topbar title="Khóa học" subtitle="Danh mục khóa học và hiệu suất hoàn thành" />
      <PageBody>
        <div className="mb-6 flex items-center justify-between">
          <MobileHeading title="Khóa học" />
          <div className="ml-auto">
            <Button size="sm">
              <Plus className="size-4" /> Tạo khóa học
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => {
            const st = courseStatus[c.status];
            return (
              <Card key={c.id} className="group overflow-hidden transition-shadow hover:shadow-md">
                <div className={`relative h-32 bg-gradient-to-br ${c.cover}`}>
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="absolute top-3 right-3">
                    <Badge tone={st.tone} className="bg-white/90 dark:bg-black/40">
                      <Dot /> {st.label}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 left-4 flex items-center gap-3 text-xs font-medium text-white/95">
                    <span className="inline-flex items-center gap-1">
                      <PlayCircle className="size-3.5" /> {c.lessons} bài
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" /> {c.hours} giờ
                    </span>
                  </div>
                </div>

                <CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold tracking-tight">{c.title}</h3>
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="text-primary tabular font-semibold">{formatVND(c.price)}</span>
                    {c.rating > 0 && (
                      <span className="text-muted-foreground inline-flex items-center gap-1">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        <span className="tabular">{c.rating.toFixed(1)}</span>
                      </span>
                    )}
                  </div>

                  {c.status === "dang-ban" ? (
                    <>
                      <div className="text-muted-foreground mt-4 flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3.5" /> {formatNumber(c.students)} học viên
                        </span>
                        <span className="tabular">{c.completionRate}% hoàn thành</span>
                      </div>
                      <Progress value={c.completionRate} className="mt-1.5" />
                    </>
                  ) : (
                    <div className="text-muted-foreground mt-4 rounded-md border border-dashed py-3 text-center text-xs">
                      Mở bán {formatNumber(c.lessons)} bài — sắp ra mắt
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">Chi tiết</Button>
                    <Button variant="ghost" size="sm" className="flex-1">Học viên</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </PageBody>
    </>
  );
}
