import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, CircleCheck, Circle, Clock, Mail, Phone, PlayCircle, Trophy } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/ui/stat-card";
import { ConfirmButton } from "@/components/confirm-button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { formatDate, formatDuration, timeAgo } from "@/lib/utils";
import { restoreEnrollment, revokeEnrollment } from "../actions";
import { AddCoursesForm } from "./add-courses-form";

export const dynamic = "force-dynamic";

type ProgressRow = { lesson_id: string; course_id: string; watched_seconds: number | null; completed_at: string | null; updated_at: string | null };

export default async function StudentDetailPage({ params }: PageProps<"/admin/students/[id]">) {
  const { id } = await params;
  const db = createAdminSupabase();

  const { data: profile } = await db.from("profiles").select("id, email, full_name, phone, created_at").eq("id", id).maybeSingle();
  if (!profile) notFound();

  const [{ data: enrollments }, { data: courses }, { data: progress }] = await Promise.all([
    db.from("enrollments").select("id, course_id, status, enrolled_at, expires_at").eq("user_id", id).order("enrolled_at", { ascending: false }),
    db.from("courses").select("id, title").order("position"),
    db.from("progress").select("lesson_id, course_id, watched_seconds, completed_at, updated_at").eq("user_id", id),
  ]);

  const courseIds = (enrollments ?? []).map((e) => e.course_id);
  const [{ data: chapters }, { data: lessons }] = courseIds.length
    ? await Promise.all([
        db.from("chapters").select("id, course_id, title, position").in("course_id", courseIds).order("position"),
        db.from("lessons").select("id, chapter_id, course_id, title, position, duration_seconds").in("course_id", courseIds).order("position"),
      ])
    : [{ data: [] }, { data: [] }];

  const now = new Date();
  const courseTitle = new Map((courses ?? []).map((c) => [c.id, c.title]));
  const lessonById = new Map((lessons ?? []).map((l) => [l.id, l]));
  const progByLesson = new Map(((progress ?? []) as ProgressRow[]).map((p) => [p.lesson_id, p]));
  const isActive = (e: { status: string; expires_at: string | null }) =>
    e.status === "active" && (!e.expires_at || new Date(e.expires_at) > now);

  const watchedTotal = (progress ?? []).reduce((s, p) => s + (p.watched_seconds ?? 0), 0);
  const doneTotal = (progress ?? []).filter((p) => p.completed_at).length;
  const lastActive = ((progress ?? []) as ProgressRow[])
    .map((p) => p.updated_at || p.completed_at)
    .filter((x): x is string => !!x)
    .sort()
    .at(-1);

  const courseViews = (enrollments ?? []).map((e) => {
    const ls = (lessons ?? []).filter((l) => l.course_id === e.course_id);
    const done = ls.filter((l) => progByLesson.get(l.id)?.completed_at).length;
    const lastHere = ls
      .map((l) => progByLesson.get(l.id)?.updated_at)
      .filter((x): x is string => !!x)
      .sort()
      .at(-1);
    const chs = (chapters ?? [])
      .filter((c) => c.course_id === e.course_id)
      .map((c) => ({ ...c, lessons: ls.filter((l) => l.chapter_id === c.id) }));
    return { ...e, title: courseTitle.get(e.course_id) ?? "Khóa đã xóa", total: ls.length, done, lastHere, chapters: chs };
  });

  // Khóa có thể thêm: chưa ghi danh, hoặc đã khóa / hết hạn (thêm lại = mở lại với hạn mới)
  const enrollByCourse = new Map((enrollments ?? []).map((e) => [e.course_id, e]));
  const addable = (courses ?? [])
    .filter((c) => {
      const e = enrollByCourse.get(c.id);
      return !e || !isActive(e);
    })
    .map((c) => ({
      id: c.id,
      title: c.title,
      note: enrollByCourse.get(c.id) ? "Đang bị khóa / hết hạn — thêm lại sẽ mở lại" : undefined,
    }));

  const recent = ((progress ?? []) as ProgressRow[])
    .filter((p) => p.updated_at || p.completed_at)
    .sort((a, b) => (b.updated_at || b.completed_at || "").localeCompare(a.updated_at || a.completed_at || ""))
    .slice(0, 12);

  const name = profile.full_name || profile.email;

  return (
    <>
      <Topbar title={name} subtitle="Hồ sơ & quá trình học" />
      <PageBody>
        <MobileHeading title={name} subtitle="Hồ sơ & quá trình học" />
        <Link href="/admin/students" className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="size-4" /> Danh sách học viên
        </Link>

        <Card className="mb-6">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar name={name} />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">{profile.full_name || "—"}</p>
              <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <a href={`mailto:${profile.email}`} className="hover:text-foreground inline-flex items-center gap-1">
                  <Mail className="size-3.5" /> {profile.email}
                </a>
                {profile.phone && (
                  <a href={`tel:${profile.phone}`} className="hover:text-foreground inline-flex items-center gap-1">
                    <Phone className="size-3.5" /> {profile.phone}
                  </a>
                )}
                {profile.created_at && <span>Tạo tài khoản {formatDate(profile.created_at)}</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="Khóa đang học" value={String(courseViews.filter(isActive).length)} icon={BookOpen} hint={`${courseViews.length} khóa đã ghi danh`} />
          <StatCard label="Bài đã hoàn thành" value={String(doneTotal)} icon={Trophy} />
          <StatCard label="Thời gian xem" value={formatDuration(watchedTotal)} icon={Clock} hint="tổng các bài" />
          <StatCard label="Học gần nhất" value={lastActive ? timeAgo(lastActive) : "Chưa học"} icon={PlayCircle} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-4">
            {courseViews.length === 0 && (
              <Card>
                <CardContent className="text-muted-foreground py-10 text-center text-sm">
                  Học viên chưa có khóa nào — tick khóa ở khung bên cạnh để thêm.
                </CardContent>
              </Card>
            )}

            {courseViews.map((c) => {
              const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
              const active = isActive(c);
              return (
                <Card key={c.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="min-w-0">
                      <CardTitle className="flex flex-wrap items-center gap-2">
                        {c.title}
                        {active ? (
                          <Badge tone="info"><Dot /> Đang học</Badge>
                        ) : c.status === "active" ? (
                          <Badge tone="warning"><Dot /> Hết hạn</Badge>
                        ) : (
                          <Badge tone="neutral"><Dot /> Đã khóa</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Ghi danh {formatDate(c.enrolled_at)} · {c.expires_at ? `Hết hạn ${formatDate(c.expires_at)}` : "Học trọn đời"}
                        {c.lastHere && ` · Học gần nhất ${timeAgo(c.lastHere)}`}
                      </CardDescription>
                    </div>
                    {c.status === "active" ? (
                      <form action={revokeEnrollment}>
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmButton variant="ghost" size="sm" message={`Khóa quyền học "${c.title}" của ${profile.email}?`}>Khóa quyền</ConfirmButton>
                      </form>
                    ) : (
                      <form action={restoreEnrollment}>
                        <input type="hidden" name="id" value={c.id} />
                        <Button type="submit" variant="ghost" size="sm">Mở lại</Button>
                      </form>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="mb-3 flex items-center gap-3">
                      <Progress value={pct} className="flex-1" />
                      <span className="tabular text-sm font-medium">{c.done}/{c.total} bài · {pct}%</span>
                    </div>

                    <details className="group">
                      <summary className="text-primary cursor-pointer text-sm font-medium select-none">
                        Xem chi tiết từng bài
                      </summary>
                      <div className="mt-3 space-y-4">
                        {c.chapters.map((ch) => {
                          const chDone = ch.lessons.filter((l) => progByLesson.get(l.id)?.completed_at).length;
                          return (
                            <div key={ch.id}>
                              <p className="mb-1 flex justify-between text-sm font-medium">
                                <span>{ch.title}</span>
                                <span className="text-muted-foreground tabular text-xs">{chDone}/{ch.lessons.length}</span>
                              </p>
                              <ul className="divide-y rounded-md border">
                                {ch.lessons.map((l) => {
                                  const p = progByLesson.get(l.id);
                                  const watched = p?.watched_seconds ?? 0;
                                  return (
                                    <li key={l.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                                      {p?.completed_at ? (
                                        <CircleCheck className="text-success size-4 shrink-0" />
                                      ) : watched > 0 ? (
                                        <PlayCircle className="text-warning size-4 shrink-0" />
                                      ) : (
                                        <Circle className="text-muted-foreground/50 size-4 shrink-0" />
                                      )}
                                      <span className={`min-w-0 flex-1 truncate ${p?.completed_at || watched ? "" : "text-muted-foreground"}`}>{l.title}</span>
                                      <span className="text-muted-foreground shrink-0 text-xs">
                                        {p?.completed_at
                                          ? `Xong ${formatDate(p.completed_at)}`
                                          : watched > 0
                                            ? `Đã xem ${formatDuration(watched)}${l.duration_seconds ? ` / ${formatDuration(l.duration_seconds)}` : ""}`
                                            : "Chưa học"}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-6">
            <Card className="h-fit">
              <CardHeader>
                <div>
                  <CardTitle>Thêm khóa học</CardTitle>
                  <CardDescription>Tick khóa rồi bấm thêm — học viên vào học được ngay.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <AddCoursesForm userId={profile.id} courses={addable} />
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Hoạt động học gần đây</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {recent.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Chưa học bài nào.</p>
                ) : (
                  <ul className="space-y-3">
                    {recent.map((p) => {
                      const l = lessonById.get(p.lesson_id);
                      const at = p.updated_at || p.completed_at!;
                      return (
                        <li key={p.lesson_id} className="flex gap-2 text-sm">
                          {p.completed_at ? <CircleCheck className="text-success mt-0.5 size-4 shrink-0" /> : <PlayCircle className="text-warning mt-0.5 size-4 shrink-0" />}
                          <div className="min-w-0">
                            <p className="leading-snug">{p.completed_at ? "Học xong" : "Đang xem"}: {l?.title ?? "bài học"}</p>
                            <p className="text-muted-foreground text-xs">{courseTitle.get(p.course_id)} · {timeAgo(at)}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}
