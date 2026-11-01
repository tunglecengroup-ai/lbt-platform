import { GraduationCap, UserCheck, Trophy, UserPlus } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/ui/stat-card";
import { ConfirmButton } from "@/components/confirm-button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import { ImportForm } from "./import-form";
import { restoreEnrollment, revokeEnrollment } from "./actions";

type EnrollmentView = {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
  expires_at: string | null;
};

export default async function StudentsPage({ searchParams }: PageProps<"/admin/students">) {
  const q = String((await searchParams).q ?? "").trim().toLowerCase();
  const db = createAdminSupabase();
  const [{ data: courses }, { data: enrollments }, { data: profiles }, { data: lessons }, { data: progress }] = await Promise.all([
    db.from("courses").select("id, title").order("position"),
    db.from("enrollments").select("*").order("enrolled_at", { ascending: false }).limit(1000),
    db.from("profiles").select("id, email, full_name, phone, created_at").order("created_at", { ascending: false }),
    db.from("lessons").select("course_id"),
    db.from("progress").select("user_id, course_id").not("completed_at", "is", null),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const courseById = new Map((courses ?? []).map((c) => [c.id, c.title]));
  const lessonTotal = (cid: string) => (lessons ?? []).filter((l) => l.course_id === cid).length;
  const doneCount = (uid: string, cid: string) => (progress ?? []).filter((p) => p.user_id === uid && p.course_id === cid).length;

  const rows = ((enrollments ?? []) as EnrollmentView[])
    .map((e) => {
      const total = lessonTotal(e.course_id);
      const pct = total ? Math.round((doneCount(e.user_id, e.course_id) / total) * 100) : 0;
      return { ...e, profile: profileById.get(e.user_id), course: courseById.get(e.course_id), pct };
    })
    .filter((r) => !q || `${r.profile?.email} ${r.profile?.full_name} ${r.profile?.phone}`.toLowerCase().includes(q));

  const active = rows.filter((r) => r.status === "active");
  const uniqueStudents = new Set(active.map((r) => r.user_id)).size;

  // Tự đăng ký ở /hoc/dang-ky nhưng chưa có khóa nào = khách tiềm năng để chăm sóc
  const enrolledIds = new Set((enrollments ?? []).map((e) => e.user_id));
  const signups = (profiles ?? [])
    .filter((p) => !enrolledIds.has(p.id))
    .filter((p) => !q || `${p.email} ${p.full_name} ${p.phone}`.toLowerCase().includes(q));

  return (
    <>
      <Topbar title="Học viên" subtitle="Quyền học, tiến độ, nhập học viên cũ từ Edubit" />
      <PageBody>
        <MobileHeading title="Học viên" />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Học viên đang học" value={String(uniqueStudents)} icon={GraduationCap} hint={`${active.length} lượt ghi danh`} />
          <StatCard label="Đã bắt đầu học" value={String(active.filter((r) => r.pct > 0).length)} icon={UserCheck} hint="có ít nhất 1 bài hoàn thành" />
          <StatCard label="Hoàn thành khóa" value={String(active.filter((r) => r.pct === 100).length)} icon={Trophy} hint="100% bài học" />
          <StatCard label="Đăng ký chưa mua" value={String(signups.length)} icon={UserPlus} hint="tạo tài khoản, chưa có khóa" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            <form className="flex gap-2 border-b p-4">
              <input name="q" defaultValue={q} placeholder="Tìm theo email, tên, số điện thoại…" className="bg-background focus:border-primary h-10 flex-1 rounded-md border px-3 text-sm outline-none" />
              <Button type="submit" variant="outline">Tìm</Button>
            </form>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-muted-foreground text-left">
                    <th className="px-4 py-3 font-medium">Học viên</th>
                    <th className="px-4 py-3 font-medium">Khóa học</th>
                    <th className="px-4 py-3 font-medium">Tiến độ</th>
                    <th className="px-4 py-3 font-medium">Ghi danh</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.length === 0 && (
                    <tr><td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">Chưa có học viên</td></tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.profile?.full_name || r.profile?.email || "?"} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{r.profile?.full_name || "—"}</p>
                            <p className="text-muted-foreground truncate text-xs">{r.profile?.email} {r.profile?.phone && `· ${r.profile.phone}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-muted-foreground px-4 py-3">{r.course}</td>
                      <td className="w-40 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={r.pct} className="flex-1" />
                          <span className="tabular w-9 text-right text-xs">{r.pct}%</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-xs">
                        {formatDate(r.enrolled_at)}
                        {r.expires_at && <p>Hết hạn {formatDate(r.expires_at)}</p>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === "active" ? (
                          <form action={revokeEnrollment}>
                            <input type="hidden" name="id" value={r.id} />
                            <ConfirmButton variant="ghost" size="sm" message={`Khóa quyền học của ${r.profile?.email}?`}>Khóa quyền</ConfirmButton>
                          </form>
                        ) : (
                          <form action={restoreEnrollment} className="flex items-center justify-end gap-2">
                            <Badge tone="neutral"><Dot /> Đã khóa</Badge>
                            <input type="hidden" name="id" value={r.id} />
                            <Button type="submit" variant="ghost" size="sm">Mở lại</Button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <div>
                <CardTitle>Đăng ký tài khoản, chưa có khóa ({signups.length})</CardTitle>
                <CardDescription>Tự đăng ký ở trang /hoc/dang-ky — gọi/Zalo chăm sóc, hoặc cấp quyền học ở khung bên cạnh.</CardDescription>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-muted-foreground text-left">
                    <th className="px-4 py-3 font-medium">Người đăng ký</th>
                    <th className="px-4 py-3 font-medium">Số điện thoại</th>
                    <th className="px-4 py-3 font-medium">Ngày đăng ký</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {signups.length === 0 && (
                    <tr><td colSpan={3} className="text-muted-foreground px-4 py-8 text-center">Chưa có ai</td></tr>
                  )}
                  {signups.slice(0, 200).map((p) => (
                    <tr key={p.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={p.full_name || p.email || "?"} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.full_name || "—"}</p>
                            <p className="text-muted-foreground truncate text-xs">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.phone ? <a href={`tel:${p.phone}`} className="text-primary hover:underline">{p.phone}</a> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-xs">{p.created_at ? formatDate(p.created_at) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <div>
                <CardTitle>Cấp quyền / Nhập từ Edubit</CardTitle>
                <CardDescription>Học viên đăng nhập bằng đúng email này là vào học được ngay.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ImportForm courses={courses ?? []} />
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
