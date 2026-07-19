import { GraduationCap, CheckCircle2, AlertTriangle, Search, Download } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate, timeAgo } from "@/lib/utils";
import { students } from "@/lib/mock-data";
import { studentStatus } from "@/lib/status";

export default function StudentsPage() {
  const dangHoc = students.filter((s) => s.status === "dang-hoc").length;
  const hoanThanh = students.filter((s) => s.status === "hoan-thanh").length;
  const nguyCo = students.filter((s) => s.status === "nguy-co" || s.status === "bo-hoc").length;

  return (
    <>
      <Topbar title="Học viên" subtitle="Theo dõi tiến độ học và phát hiện học viên nguy cơ bỏ" />
      <PageBody>
        <MobileHeading title="Học viên" subtitle="Tiến độ học của từng người" />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Đang học" value={String(dangHoc)} icon={GraduationCap} hint="hoạt động 7 ngày qua" />
          <StatCard label="Đã hoàn thành" value={String(hoanThanh)} icon={CheckCircle2} hint="đủ điều kiện cấp chứng chỉ" />
          <StatCard label="Nguy cơ / đã bỏ" value={String(nguyCo)} icon={AlertTriangle} hint="cần chăm sóc lại" />
        </div>

        <Card className="overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:w-72">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="search"
                placeholder="Tìm theo tên hoặc email…"
                className="bg-background focus:border-primary focus:ring-primary/20 h-10 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus:ring-2"
              />
            </div>
            <Button variant="outline" size="sm">
              <Download className="size-4" /> Xuất Excel
            </Button>
          </div>

          {/* Table (desktop) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-left">
                  <th className="px-4 py-3 font-medium">Học viên</th>
                  <th className="px-4 py-3 font-medium">Khóa học</th>
                  <th className="px-4 py-3 font-medium">Ghi danh</th>
                  <th className="w-48 px-4 py-3 font-medium">Tiến độ</th>
                  <th className="px-4 py-3 font-medium">Hoạt động</th>
                  <th className="px-4 py-3 text-right font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map((s) => {
                  const st = studentStatus[s.status];
                  return (
                    <tr key={s.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} />
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-muted-foreground text-xs">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-muted-foreground px-4 py-3">{s.course}</td>
                      <td className="text-muted-foreground tabular px-4 py-3">{formatDate(s.enrolledAt)}</td>
                      <td className="px-4 py-3">
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="tabular font-medium">{s.progress}%</span>
                          <span className="text-muted-foreground tabular">
                            {s.lessonsDone}/{s.lessonsTotal} bài
                          </span>
                        </div>
                        <Progress value={s.progress} barClassName={s.status === "nguy-co" ? "bg-warning" : undefined} />
                      </td>
                      <td className="text-muted-foreground tabular px-4 py-3 text-xs">{timeAgo(s.lastActive)}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge tone={st.tone}>
                          <Dot /> {st.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Card list (mobile) */}
          <ul className="divide-y md:hidden">
            {students.map((s) => {
              const st = studentStatus[s.status];
              return (
                <li key={s.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{s.name}</p>
                      <p className="text-muted-foreground truncate text-xs">{s.course}</p>
                    </div>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="tabular font-medium">{s.progress}%</span>
                      <span className="text-muted-foreground tabular">{s.lessonsDone}/{s.lessonsTotal} bài</span>
                    </div>
                    <Progress value={s.progress} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </PageBody>
    </>
  );
}
