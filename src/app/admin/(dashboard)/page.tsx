import Link from "next/link";
import {
  Banknote,
  Users,
  GraduationCap,
  TrendingUp,
  ArrowRight,
  UserPlus,
  Receipt,
  CircleCheck,
} from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody, SectionTitle } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { RevenueChart, LeadsSourceChart, type MonthPoint, type SourceSlice } from "@/components/charts";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { formatDate, formatShortVND, formatVND, timeAgo } from "@/lib/utils";
import { LEAD_STAGES } from "@/lib/types";

export const dynamic = "force-dynamic";

const VN_OFFSET = 7 * 3600_000;
/** "2026-11" theo giờ Việt Nam */
const monthKey = (iso: string) => new Date(new Date(iso).getTime() + VN_OFFSET).toISOString().slice(0, 7);
const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : undefined);

const SOURCE_COLORS = ["hsl(var(--primary))", "hsl(var(--violet))", "hsl(var(--info))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--danger))"];

type Activity = { id: string; type: "lead" | "order" | "signup" | "progress"; text: string; at: string };
const activityIcon = { lead: Users, order: Receipt, signup: UserPlus, progress: CircleCheck } as const;
const activityTone = {
  lead: "text-info bg-info-soft",
  order: "text-success bg-success-soft",
  signup: "text-violet bg-violet-soft",
  progress: "text-warning bg-warning-soft",
} as const;

export default async function OverviewPage() {
  const db = createAdminSupabase();
  const now = new Date();
  const since = new Date(now.getTime() - 400 * 86_400_000).toISOString();
  const [{ data: orders }, { data: profiles }, { data: enrollments }, { data: leads }, { data: courses }, { data: lessons }, { data: progress }] =
    await Promise.all([
      db.from("orders").select("id, customer_name, customer_email, amount_vnd, status, paid_at, created_at, course_id").gte("created_at", since),
      db.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: false }),
      db.from("enrollments").select("user_id, course_id, status, enrolled_at, expires_at").order("enrolled_at", { ascending: false }),
      db.from("leads").select("id, name, source, stage, created_at").order("created_at", { ascending: false }),
      db.from("courses").select("id, title"),
      db.from("lessons").select("course_id"),
      db.from("progress").select("user_id, course_id, completed_at").not("completed_at", "is", null).order("completed_at", { ascending: false }),
    ]);

  const thisMonth = monthKey(now.toISOString());
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString());
  const courseTitle = new Map((courses ?? []).map((c) => [c.id, c.title]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Doanh thu
  const paid = (orders ?? []).filter((o) => o.status === "paid" && o.paid_at);
  const revenueOf = (m: string) => paid.filter((o) => monthKey(o.paid_at!) === m).reduce((s, o) => s + o.amount_vnd, 0);
  const revThis = revenueOf(thisMonth);
  const revPrev = revenueOf(lastMonth);

  // Học viên đang học (còn hạn)
  const activeEnr = (enrollments ?? []).filter((e) => e.status === "active" && (!e.expires_at || new Date(e.expires_at) > now));
  const activeStudents = new Set(activeEnr.map((e) => e.user_id)).size;

  // Lead + tỷ lệ chốt (đơn đã trả / tổng đơn trong tháng)
  const openLeads = (leads ?? []).filter((l) => !["chot", "mat"].includes(l.stage)).length;
  const ordersThisMonth = (orders ?? []).filter((o) => monthKey(o.created_at) === thisMonth);
  const closeRate = ordersThisMonth.length
    ? Math.round((ordersThisMonth.filter((o) => o.status === "paid").length / ordersThisMonth.length) * 1000) / 10
    : null;

  // Biểu đồ 12 tháng
  const months: MonthPoint[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 15);
    const key = monthKey(d.toISOString());
    return {
      month: `T${d.getMonth() + 1}`,
      doanhThu: revenueOf(key),
      hocVienMoi: (profiles ?? []).filter((p) => p.created_at && monthKey(p.created_at) === key).length,
    };
  });
  const rev12 = months.reduce((s, m) => s + m.doanhThu, 0);

  // Nguồn lead
  const bySource = new Map<string, number>();
  for (const l of leads ?? []) bySource.set(l.source || "Khác", (bySource.get(l.source || "Khác") ?? 0) + 1);
  const sources: SourceSlice[] = [...bySource.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([source, value], i) => ({ source, value, color: SOURCE_COLORS[i % SOURCE_COLORS.length] }));

  // Học viên mới ghi danh + tiến độ
  const lessonTotal = (cid: string) => (lessons ?? []).filter((l) => l.course_id === cid).length;
  const doneCount = (uid: string, cid: string) => (progress ?? []).filter((p) => p.user_id === uid && p.course_id === cid).length;
  const recent = (enrollments ?? []).slice(0, 5).map((e) => {
    const p = profileById.get(e.user_id);
    const total = lessonTotal(e.course_id);
    return {
      key: `${e.user_id}-${e.course_id}`,
      name: p?.full_name || p?.email || "Học viên",
      course: courseTitle.get(e.course_id) ?? "—",
      progress: total ? Math.round((doneCount(e.user_id, e.course_id) / total) * 100) : 0,
      active: e.status === "active" && (!e.expires_at || new Date(e.expires_at) > now),
      at: e.enrolled_at,
    };
  });

  // Hoạt động gần đây
  const activity: Activity[] = [
    ...paid.slice(0, 20).map((o) => ({
      id: `o${o.id}`, type: "order" as const, at: o.paid_at!,
      text: `${o.customer_name || o.customer_email} thanh toán ${formatVND(o.amount_vnd)} — ${courseTitle.get(o.course_id ?? "") ?? "khóa học"}`,
    })),
    ...(profiles ?? []).slice(0, 20).filter((p) => p.created_at).map((p) => ({
      id: `p${p.id}`, type: "signup" as const, at: p.created_at!, text: `${p.full_name || p.email} đăng ký tài khoản`,
    })),
    ...(leads ?? []).slice(0, 20).map((l) => ({
      id: `l${l.id}`, type: "lead" as const, at: l.created_at, text: `Lead mới: ${l.name}${l.source ? ` (${l.source})` : ""}`,
    })),
    ...(progress ?? []).slice(0, 20).map((p, i) => ({
      id: `g${i}`, type: "progress" as const, at: p.completed_at!,
      text: `${profileById.get(p.user_id)?.full_name || profileById.get(p.user_id)?.email || "Học viên"} học xong 1 bài — ${courseTitle.get(p.course_id) ?? ""}`,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const today = `Cập nhật ${formatDate(now.toISOString())}`;

  return (
    <>
      <Topbar title="Tổng quan" subtitle={today} />
      <PageBody>
        <MobileHeading title="Tổng quan" subtitle={today} />

        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={`Doanh thu tháng ${now.getMonth() + 1}`} value={formatShortVND(revThis)} delta={pct(revThis, revPrev)} icon={Banknote} hint="so với tháng trước" />
          <StatCard label="Học viên đang học" value={activeStudents.toLocaleString("vi-VN")} icon={GraduationCap} hint="còn hạn học" />
          <StatCard label="Lead đang xử lý" value={String(openLeads)} icon={Users} hint="cần chăm sóc" />
          <StatCard label="Tỷ lệ chốt đơn" value={closeRate === null ? "—" : `${closeRate.toLocaleString("vi-VN")}%`} icon={TrendingUp} hint="đơn đã trả / đơn tạo tháng này" />
        </div>

        {/* Chart row */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Doanh thu 12 tháng</CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">Tổng {formatVND(rev12)}</p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <RevenueChart data={months} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nguồn lead</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadsSourceChart data={sources} />
            </CardContent>
          </Card>
        </div>

        {/* Bottom row */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Ghi danh mới nhất</CardTitle>
              <Link href="/admin/students" className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline">
                Xem tất cả <ArrowRight className="size-4" />
              </Link>
            </CardHeader>
            <CardContent className="pt-2">
              {recent.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">Chưa có học viên nào được ghi danh.</p>
              ) : (
                <ul className="divide-y">
                  {recent.map((s) => (
                    <li key={s.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <Avatar name={s.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="text-muted-foreground truncate text-xs">{s.course} · {timeAgo(s.at)}</p>
                      </div>
                      <div className="hidden w-32 sm:block">
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-muted-foreground">Tiến độ</span>
                          <span className="tabular font-medium">{s.progress}%</span>
                        </div>
                        <Progress value={s.progress} />
                      </div>
                      <Badge tone={s.active ? "info" : "neutral"}>
                        <Dot /> {s.active ? "Đang học" : "Hết hạn"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hoạt động gần đây</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {activity.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">Chưa có hoạt động.</p>
              ) : (
                <ul className="space-y-4">
                  {activity.map((a) => {
                    const Icon = activityIcon[a.type];
                    return (
                      <li key={a.id} className="flex gap-3">
                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${activityTone[a.type]}`}>
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm leading-snug">{a.text}</p>
                          <p className="text-muted-foreground mt-0.5 text-xs">{timeAgo(a.at)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Phễu lead */}
        <div className="mt-6">
          <SectionTitle
            title="Phễu bán hàng"
            action={
              <Link href="/admin/crm" className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline">
                Mở CRM <ArrowRight className="size-4" />
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {LEAD_STAGES.map((stage) => (
              <Card key={stage.id} className="p-4">
                <div className="flex items-center gap-1.5">
                  <Badge tone={stage.tone} className="h-5 px-2 text-[11px]">
                    <Dot />
                  </Badge>
                  <span className="text-muted-foreground truncate text-xs font-medium">{stage.label}</span>
                </div>
                <p className="tabular mt-2 text-2xl font-semibold">{(leads ?? []).filter((l) => l.stage === stage.id).length}</p>
              </Card>
            ))}
          </div>
        </div>
      </PageBody>
    </>
  );
}
