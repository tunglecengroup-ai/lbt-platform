import Link from "next/link";
import { GraduationCap, UserCheck, Trophy, UserPlus, Download, Filter, X, Crown } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/ui/stat-card";
import { ConfirmButton } from "@/components/confirm-button";
import { formatDate, timeAgo } from "@/lib/utils";
import { hasFilter, loadStudents, parseStudentFilter } from "@/lib/student-list";
import { ImportForm } from "./import-form";
import { deleteEnrollment, restoreEnrollment, revokeEnrollment } from "./actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const selectClass = "bg-background focus:border-primary h-10 rounded-md border px-2 text-sm outline-none";

const stateBadge = {
  "dang-hoc": { tone: "info", label: "Đang học" },
  "het-han": { tone: "warning", label: "Hết hạn" },
  "da-khoa": { tone: "neutral", label: "Đã khóa" },
} as const;

export default async function StudentsPage({ searchParams }: PageProps<"/admin/students">) {
  const sp = await searchParams;
  const f = parseStudentFilter(sp);
  const page = Math.max(1, Number(sp.page) || 1);
  const { courses, rows, signups, stats } = await loadStudents(f);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const qs = (extra: Record<string, string | number>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, ...extra })) if (v) p.set(k, String(v));
    return `?${p}`;
  };
  const exportHref = `/admin/students/export${qs({})}`;

  return (
    <>
      <Topbar title="Học viên" subtitle="Bấm vào tên học viên để xem quá trình học, thêm/xóa khóa" />
      <PageBody>
        <MobileHeading title="Học viên" />

        {sp.deleted === "1" && (
          <p className="bg-success-soft text-success mb-4 rounded-md px-4 py-2 text-sm font-medium">Đã xóa học viên khỏi hệ thống.</p>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-5">
          <StatCard label="Học viên đang học" value={String(stats.students)} icon={GraduationCap} hint={`${stats.activeEnrollments} lượt ghi danh còn hạn`} />
          <StatCard label="Đã bắt đầu học" value={String(stats.started)} icon={UserCheck} hint="có ít nhất 1 bài xong" />
          <StatCard label="Hoàn thành khóa" value={String(stats.completed)} icon={Trophy} hint="100% bài học" />
          <StatCard label="Thành viên Member" value={String(stats.members)} icon={Crown} hint="gói còn hạn" />
          <StatCard label="Đăng ký chưa mua" value={String(stats.signups)} icon={UserPlus} hint="có tài khoản, chưa có khóa" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="min-w-0 space-y-6">
            <Card className="overflow-hidden">
              {/* Bộ lọc */}
              <form className="space-y-3 border-b p-4">
                <div className="flex gap-2">
                  <input name="q" defaultValue={f.q} placeholder="Tìm theo email, tên, số điện thoại…" className={`${selectClass} flex-1 px-3`} />
                  <Button type="submit"><Filter className="size-4" /> Lọc</Button>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-6">
                  <select name="course" defaultValue={f.course} className={selectClass} aria-label="Khóa học">
                    <option value="">Tất cả khóa học</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <select name="status" defaultValue={f.status} className={selectClass} aria-label="Trạng thái">
                    <option value="">Mọi trạng thái</option>
                    <option value="dang-hoc">Đang học (còn hạn)</option>
                    <option value="het-han">Hết hạn</option>
                    <option value="da-khoa">Đã khóa quyền</option>
                  </select>
                  <select name="progress" defaultValue={f.progress} className={selectClass} aria-label="Tiến độ">
                    <option value="">Mọi tiến độ</option>
                    <option value="chua-hoc">Chưa học bài nào</option>
                    <option value="dang-hoc">Đang học dở</option>
                    <option value="hoan-thanh">Hoàn thành 100%</option>
                  </select>
                  <select name="member" defaultValue={f.member} className={selectClass} aria-label="Thành viên">
                    <option value="">Member & không</option>
                    <option value="member">Chỉ thành viên Member</option>
                    <option value="khong">Không phải Member</option>
                  </select>
                  <label className="text-muted-foreground flex items-center gap-1 text-xs">
                    Từ <input type="date" name="from" defaultValue={f.from} className={`${selectClass} min-w-0 flex-1`} />
                  </label>
                  <label className="text-muted-foreground flex items-center gap-1 text-xs">
                    Đến <input type="date" name="to" defaultValue={f.to} className={`${selectClass} min-w-0 flex-1`} />
                  </label>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {rows.length.toLocaleString("vi-VN")} lượt ghi danh khớp bộ lọc
                    {hasFilter(f) && (
                      <Link href="/admin/students" className="text-primary ml-2 inline-flex items-center gap-1 font-medium hover:underline">
                        <X className="size-3.5" /> Bỏ lọc
                      </Link>
                    )}
                  </span>
                  <a href={exportHref} className="text-primary inline-flex items-center gap-1 font-medium hover:underline">
                    <Download className="size-4" /> Xuất Excel (CSV)
                  </a>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
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
                    {shown.length === 0 && (
                      <tr><td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">Không có học viên nào khớp</td></tr>
                    )}
                    {shown.map((r) => {
                      const b = stateBadge[r.state];
                      return (
                        <tr key={r.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <Link href={`/admin/students/${r.user_id}`} className="group flex items-center gap-3">
                              <Avatar name={r.profile?.full_name || r.profile?.email || "?"} />
                              <div className="min-w-0">
                                <p className="group-hover:text-primary flex items-center gap-1 truncate font-medium group-hover:underline">
                                  {r.profile?.full_name || "—"}
                                  {r.isMember && <Crown className="text-warning size-3.5 shrink-0" aria-label="Thành viên Member" />}
                                </p>
                                <p className="text-muted-foreground truncate text-xs">{r.profile?.email} {r.profile?.phone && `· ${r.profile.phone}`}</p>
                              </div>
                            </Link>
                          </td>
                          <td className="min-w-[200px] px-4 py-3">
                            <p className="text-muted-foreground">{r.course}</p>
                            <Badge tone={b.tone} className="mt-1 h-5 px-1.5 text-[11px] whitespace-nowrap"><Dot /> {b.label}</Badge>
                          </td>
                          <td className="w-44 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Progress value={r.pct} className="flex-1" />
                              <span className="tabular w-16 text-right text-xs">{r.done}/{r.total}</span>
                            </div>
                            <p className="text-muted-foreground mt-1 text-[11px]">{r.lastAt ? `Học ${timeAgo(r.lastAt)}` : "Chưa học"}</p>
                          </td>
                          <td className="text-muted-foreground px-4 py-3 text-xs whitespace-nowrap">
                            {formatDate(r.enrolled_at)}
                            {r.expires_at && <p>Hết hạn {formatDate(r.expires_at)}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {r.status === "active" ? (
                                <form action={revokeEnrollment}>
                                  <input type="hidden" name="id" value={r.id} />
                                  <ConfirmButton variant="ghost" size="sm" message={`Tạm khóa quyền học "${r.course}" của ${r.profile?.email}? (Mở lại được)`}>Khóa</ConfirmButton>
                                </form>
                              ) : (
                                <form action={restoreEnrollment}>
                                  <input type="hidden" name="id" value={r.id} />
                                  <Button type="submit" variant="ghost" size="sm">Mở lại</Button>
                                </form>
                              )}
                              <form action={deleteEnrollment}>
                                <input type="hidden" name="id" value={r.id} />
                                <ConfirmButton variant="ghost" size="sm" className="text-danger" message={`XÓA HẲN quyền học "${r.course}" của ${r.profile?.email}? Không hoàn tác được (tiến độ học vẫn giữ).`}>Xóa</ConfirmButton>
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {pages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Trang {page}/{pages}</span>
                  <div className="flex gap-2">
                    {page > 1 && <Button asChild variant="outline" size="sm"><Link href={qs({ page: page - 1 })}>← Trước</Link></Button>}
                    {page < pages && <Button asChild variant="outline" size="sm"><Link href={qs({ page: page + 1 })}>Sau →</Link></Button>}
                  </div>
                </div>
              )}
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <div>
                  <CardTitle>Đăng ký tài khoản, chưa có khóa ({signups.length})</CardTitle>
                  <CardDescription>Tự đăng ký ở trang /hoc/dang-ky — bấm vào tên để thêm khóa hoặc xóa, hoặc gọi/Zalo chăm sóc.</CardDescription>
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
                          <Link href={`/admin/students/${p.id}`} className="group flex items-center gap-3">
                            <Avatar name={p.full_name || p.email || "?"} />
                            <div className="min-w-0">
                              <p className="group-hover:text-primary truncate font-medium group-hover:underline">{p.full_name || "—"}</p>
                              <p className="text-muted-foreground truncate text-xs">{p.email}</p>
                            </div>
                          </Link>
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
              <ImportForm courses={courses} />
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
