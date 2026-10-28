import Link from "next/link";
import {
  Banknote,
  Users,
  GraduationCap,
  TrendingUp,
  ArrowRight,
  UserPlus,
  Receipt,
  Zap,
  CircleCheck,
} from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody, SectionTitle } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { RevenueChart, LeadsSourceChart } from "@/components/charts";
import { formatShortVND, formatVND, timeAgo } from "@/lib/utils";
import { students, activity, leads, LEAD_STAGES } from "@/lib/mock-data";
import { studentStatus } from "@/lib/status";

const activityIcon = {
  lead: UserPlus,
  order: Receipt,
  progress: CircleCheck,
  automation: Zap,
} as const;

const activityTone = {
  lead: "text-info bg-info-soft",
  order: "text-success bg-success-soft",
  progress: "text-violet bg-violet-soft",
  automation: "text-warning bg-warning-soft",
} as const;

export default function OverviewPage() {
  const recentStudents = students.slice(0, 5);
  const openLeads = leads.filter((l) => !["chot", "mat"].includes(l.stage)).length;

  return (
    <>
      <Topbar title="Tổng quan" subtitle="Cập nhật hôm nay, 20/07/2026" />
      <PageBody>
        <MobileHeading title="Tổng quan" subtitle="Cập nhật hôm nay, 20/07/2026" />

        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Doanh thu tháng 7" value={formatShortVND(231_500_000)} delta={14} icon={Banknote} hint="so với T6" />
          <StatCard label="Học viên đang học" value="1.028" delta={8} icon={GraduationCap} hint="so với T6" />
          <StatCard label="Lead đang xử lý" value={String(openLeads)} delta={-3} icon={Users} hint="cần chăm sóc" />
          <StatCard label="Tỷ lệ chốt đơn" value="24,6%" delta={5} icon={TrendingUp} hint="so với T6" />
        </div>

        {/* Chart row */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Doanh thu 12 tháng</CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  Tổng {formatVND(1_935_500_000)} — tăng trưởng đều
                </p>
              </div>
              <Badge tone="success">
                <Dot /> +14% MoM
              </Badge>
            </CardHeader>
            <CardContent className="pt-2">
              <RevenueChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nguồn lead</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadsSourceChart />
            </CardContent>
          </Card>
        </div>

        {/* Bottom row */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Học viên gần đây */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Học viên mới nhất</CardTitle>
              <Link href="/admin/students" className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline">
                Xem tất cả <ArrowRight className="size-4" />
              </Link>
            </CardHeader>
            <CardContent className="pt-2">
              <ul className="divide-y">
                {recentStudents.map((s) => {
                  const st = studentStatus[s.status];
                  return (
                    <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <Avatar name={s.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="text-muted-foreground truncate text-xs">{s.course}</p>
                      </div>
                      <div className="hidden w-32 sm:block">
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-muted-foreground">Tiến độ</span>
                          <span className="tabular font-medium">{s.progress}%</span>
                        </div>
                        <Progress value={s.progress} />
                      </div>
                      <Badge tone={st.tone}>
                        <Dot /> {st.label}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Hoạt động */}
          <Card>
            <CardHeader>
              <CardTitle>Hoạt động gần đây</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
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
            </CardContent>
          </Card>
        </div>

        {/* Phễu lead mini */}
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
            {LEAD_STAGES.map((stage) => {
              const count = leads.filter((l) => l.stage === stage.id).length;
              return (
                <Card key={stage.id} className="p-4">
                  <div className="flex items-center gap-1.5">
                    <Badge tone={stage.tone} className="h-5 px-2 text-[11px]">
                      <Dot />
                    </Badge>
                    <span className="text-muted-foreground truncate text-xs font-medium">{stage.label}</span>
                  </div>
                  <p className="tabular mt-2 text-2xl font-semibold">{count}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </PageBody>
    </>
  );
}
