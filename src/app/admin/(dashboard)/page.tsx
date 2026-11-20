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
  ShoppingCart,
  UserRound,
  BookOpenCheck,
  Clock3,
  CalendarRange,
} from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody, SectionTitle } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { RevenueChart, LeadsSourceChart, type MonthPoint, type SourceSlice } from "@/components/charts";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { formatShortVND, formatVND, timeAgo } from "@/lib/utils";
import { LEAD_STAGES } from "@/lib/types";
import { CHANNELS, type Channel } from "@/lib/channels";
import { buckets, COMPARES, comparePeriod, inPeriod, PRESETS, resolvePeriod, vnDay, type CompareId, type Period } from "@/lib/periods";

export const dynamic = "force-dynamic";

/** % thay đổi so với kỳ so sánh */
const pct = (cur: number, prev: number | undefined) =>
  prev === undefined || prev === 0 ? undefined : Math.round(((cur - prev) / prev) * 100);

type Activity = { id: string; type: "lead" | "order" | "signup" | "progress"; text: string; at: string };
const activityIcon = { lead: Users, order: Receipt, signup: UserPlus, progress: CircleCheck } as const;
const activityTone = {
  lead: "text-info bg-info-soft",
  order: "text-success bg-success-soft",
  signup: "text-violet bg-violet-soft",
  progress: "text-warning bg-warning-soft",
} as const;

/** Tên + màu kênh; lead cũ chưa có kênh chuẩn thì dùng chữ "nguồn" gốc */
const chLabel = (c: string) => (c in CHANNELS ? CHANNELS[c as Channel].label : c);
const chColor = (c: string, i: number) =>
  c in CHANNELS ? CHANNELS[c as Channel].color : ["#6366f1", "#14b8a6", "#f59e0b", "#ec4899", "#84cc16"][i % 5];

/** Supabase trả tối đa 1000 dòng/lần */
async function fetchAll<T>(q: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

type O = { id: string; customer_name: string | null; customer_email: string | null; amount_vnd: number; status: string; paid_at: string | null; created_at: string; course_id: string | null; channel: string | null };
type Pf = { id: string; email: string; full_name: string | null; created_at: string | null; signup_channel: string | null; first_channel: string | null };
type E = { user_id: string; course_id: string; status: string; enrolled_at: string; expires_at: string | null; source: string | null };
type L = { id: string; name: string; source: string | null; channel: string | null; stage: string; created_at: string };

const selectClass = "bg-background focus:border-primary h-9 rounded-md border px-2 text-sm outline-none";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const now = new Date();
  const period = resolvePeriod(s("ky"), s("tu"), s("den"), now);
  const cmpMode = (COMPARES.some((c) => c.id === s("ss")) ? s("ss") : "ky-truoc") as CompareId;
  const cmp = comparePeriod(period, cmpMode);
  const table = (["thang", "quy", "nam"].includes(s("bang") ?? "") ? s("bang") : "thang") as "thang" | "quy" | "nam";

  const db = createAdminSupabase();
  const [orders, profiles, enrollments, leads, { data: courses }, { data: lessons }, { data: progress }] = await Promise.all([
    fetchAll<O>((a, b) => db.from("orders").select("id, customer_name, customer_email, amount_vnd, status, paid_at, created_at, course_id, channel").order("created_at").range(a, b)),
    fetchAll<Pf>((a, b) => db.from("profiles").select("id, email, full_name, created_at, signup_channel, first_channel").order("created_at", { ascending: false }).range(a, b)),
    fetchAll<E>((a, b) => db.from("enrollments").select("user_id, course_id, status, enrolled_at, expires_at, source").order("enrolled_at", { ascending: false }).range(a, b)),
    fetchAll<L>((a, b) => db.from("leads").select("id, name, source, channel, stage, created_at").order("created_at", { ascending: false }).range(a, b)),
    db.from("courses").select("id, title"),
    db.from("lessons").select("course_id"),
    db.from("progress").select("user_id, course_id, completed_at").not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(2000),
  ]);

  const courseTitle = new Map((courses ?? []).map((c) => [c.id, c.title]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const paid = orders.filter((o) => o.status === "paid" && o.paid_at);

  /** Số liệu của 1 kỳ */
  const metrics = (p: Pick<Period, "start" | "end">) => {
    const paidIn = paid.filter((o) => inPeriod(o.paid_at, p));
    const created = orders.filter((o) => inPeriod(o.created_at, p) && o.amount_vnd > 0);
    return {
      revenue: paidIn.reduce((t, o) => t + o.amount_vnd, 0),
      paidOrders: paidIn.filter((o) => o.amount_vnd > 0).length,
      createdOrders: created.length,
      closeRate: created.length ? Math.round((created.filter((o) => o.status === "paid").length / created.length) * 100) : null,
      signups: profiles.filter((x) => inPeriod(x.created_at, p)).length,
      leads: leads.filter((l) => inPeriod(l.created_at, p)).length,
      newEnroll: new Set(enrollments.filter((e) => inPeriod(e.enrolled_at, p)).map((e) => e.user_id)).size,
    };
  };
  const cur = metrics(period);
  const prev = cmp ? metrics(cmp) : undefined;

  // Ảnh chụp hiện tại
  const activeEnr = enrollments.filter((e) => e.status === "active" && (!e.expires_at || new Date(e.expires_at) > now));
  const activeStudents = new Set(activeEnr.map((e) => e.user_id)).size;
  const paidStudents = new Set(activeEnr.filter((e) => e.source !== "tang-khi-dang-ky").map((e) => e.user_id)).size;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const openLeads = leads.filter((l) => !["chot", "mat"].includes(l.stage)).length;

  // Nguồn trong kỳ: lead / tài khoản mới / đơn đã trả + doanh thu theo kênh
  type SrcRow = { key: string; leads: number; signups: number; paid: number; revenue: number };
  const src = new Map<string, SrcRow>();
  const srow = (k: string) => {
    let r = src.get(k);
    if (!r) src.set(k, (r = { key: k, leads: 0, signups: 0, paid: 0, revenue: 0 }));
    return r;
  };
  for (const l of leads) if (inPeriod(l.created_at, period)) srow(l.channel || l.source || "direct").leads++;
  for (const p of profiles) if (inPeriod(p.created_at, period)) srow(p.signup_channel || p.first_channel || "direct").signups++;
  for (const o of paid) if (inPeriod(o.paid_at, period) && o.amount_vnd > 0) {
    const r = srow(o.channel || "direct");
    r.paid++;
    r.revenue += o.amount_vnd;
  }
  const srcRows = [...src.values()].sort((a, b) => b.revenue - a.revenue || b.paid - a.paid || b.signups - a.signups || b.leads - a.leads);
  const leadSlices: SourceSlice[] = srcRows.filter((r) => r.leads > 0).sort((a, b) => b.leads - a.leads)
    .map((r, i) => ({ source: chLabel(r.key), value: r.leads, color: chColor(r.key, i) }));
  const orderSlices: SourceSlice[] = srcRows.filter((r) => r.paid > 0)
    .map((r, i) => ({ source: chLabel(r.key), value: r.paid, color: chColor(r.key, i) }));

  // Bảng so sánh tháng / quý / năm
  const cmpRows = buckets(table, now).map((b) => ({ ...b, m: metrics(b) }));

  // Biểu đồ 12 tháng
  const months: MonthPoint[] = buckets("thang", now).map((b) => ({
    month: b.label.split("/")[0],
    doanhThu: metrics(b).revenue,
    hocVienMoi: profiles.filter((p) => inPeriod(p.created_at, b)).length,
  }));
  const rev12 = months.reduce((t, m) => t + m.doanhThu, 0);

  // Ghi danh mới nhất + tiến độ
  const lessonTotal = (cid: string) => (lessons ?? []).filter((l) => l.course_id === cid).length;
  const doneCount = (uid: string, cid: string) => (progress ?? []).filter((p) => p.user_id === uid && p.course_id === cid).length;
  const recent = enrollments.slice(0, 5).map((e) => {
    const p = profileById.get(e.user_id);
    const total = lessonTotal(e.course_id);
    return {
      key: `${e.user_id}-${e.course_id}`,
      userId: e.user_id,
      name: p?.full_name || p?.email || "Học viên",
      course: courseTitle.get(e.course_id) ?? "—",
      progress: total ? Math.round((doneCount(e.user_id, e.course_id) / total) * 100) : 0,
      active: e.status === "active" && (!e.expires_at || new Date(e.expires_at) > now),
      at: e.enrolled_at,
    };
  });

  // Hoạt động gần đây
  const activity: Activity[] = [
    ...[...paid].reverse().slice(0, 20).map((o) => ({
      id: `o${o.id}`, type: "order" as const, at: o.paid_at!,
      text: `${o.customer_name || o.customer_email} thanh toán ${formatVND(o.amount_vnd)} — ${courseTitle.get(o.course_id ?? "") ?? "khóa học"}`,
    })),
    ...profiles.slice(0, 20).filter((p) => p.created_at).map((p) => ({
      id: `p${p.id}`, type: "signup" as const, at: p.created_at!, text: `${p.full_name || p.email} đăng ký tài khoản`,
    })),
    ...leads.slice(0, 20).map((l) => ({
      id: `l${l.id}`, type: "lead" as const, at: l.created_at, text: `Lead mới: ${l.name}${l.channel || l.source ? ` (${chLabel(l.channel || l.source!)})` : ""}`,
    })),
    ...(progress ?? []).slice(0, 20).map((p, i) => ({
      id: `g${i}`, type: "progress" as const, at: p.completed_at!,
      text: `${profileById.get(p.user_id)?.full_name || profileById.get(p.user_id)?.email || "Học viên"} học xong 1 bài — ${courseTitle.get(p.course_id) ?? ""}`,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const cmpHint = cmp ? (cmpMode === "nam-truoc" ? "so với cùng kỳ năm trước" : "so với kỳ trước") : undefined;
  const qsWith = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const k of ["ky", "tu", "den", "ss", "bang"]) if (s(k)) p.set(k, s(k)!);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return `?${p}`;
  };

  return (
    <>
      <Topbar title="Tổng quan" subtitle={`${period.label}${cmp ? ` · so với ${cmp.label}` : ""}`} />
      <PageBody>
        <MobileHeading title="Tổng quan" subtitle={period.label} />

        {/* Bộ lọc kỳ */}
        <Card className="mb-6">
          <CardContent className="pt-5">
            <form className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-medium">
                <span className="text-muted-foreground mb-1 flex items-center gap-1"><CalendarRange className="size-3.5" /> Xem kỳ</span>
                <select name="ky" defaultValue={period.id} className={selectClass}>
                  {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium">
                <span className="text-muted-foreground mb-1 block">Từ ngày</span>
                <input type="date" name="tu" defaultValue={s("tu") ?? vnDay(period.start)} className={selectClass} />
              </label>
              <label className="text-xs font-medium">
                <span className="text-muted-foreground mb-1 block">Đến ngày</span>
                <input type="date" name="den" defaultValue={s("den") ?? vnDay(new Date(period.end.getTime() - 1))} className={selectClass} />
              </label>
              <label className="text-xs font-medium">
                <span className="text-muted-foreground mb-1 block">So sánh với</span>
                <select name="ss" defaultValue={cmpMode} className={selectClass}>
                  {COMPARES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
              <input type="hidden" name="bang" value={table} />
              <Button type="submit" size="sm">Xem</Button>
              <p className="text-muted-foreground w-full text-xs">Chọn &quot;Tùy chọn ngày&quot; để dùng ô Từ ngày / Đến ngày. Đang xem: <b className="text-foreground">{period.label}</b>{cmp && <> · so với <b className="text-foreground">{cmp.label}</b></>}</p>
            </form>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PRESETS.filter((p) => p.id !== "tuy-chon").map((p) => (
                <Link key={p.id} href={qsWith({ ky: p.id })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${period.id === p.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  {p.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* KPI trong kỳ */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Doanh thu" value={formatShortVND(cur.revenue)} delta={pct(cur.revenue, prev?.revenue)} icon={Banknote}
            hint={cmpHint ?? formatVND(cur.revenue)} href="/admin/orders?status=paid" />
          <StatCard label="Đơn đã thanh toán" value={String(cur.paidOrders)} delta={pct(cur.paidOrders, prev?.paidOrders)} icon={ShoppingCart}
            hint={cur.closeRate === null ? "chưa có đơn mới" : `tỷ lệ chốt ${cur.closeRate}% (${cur.createdOrders} đơn tạo)`} href="/admin/orders" />
          <StatCard label="Tài khoản đăng ký mới" value={String(cur.signups)} delta={pct(cur.signups, prev?.signups)} icon={UserPlus}
            hint={cmpHint} href="/admin/students?view=chua-mua#chua-mua" />
          <StatCard label="Lead mới" value={String(cur.leads)} delta={pct(cur.leads, prev?.leads)} icon={Users} hint={`${openLeads} lead đang xử lý`} href="/admin/crm" />
        </div>

        {/* Ảnh chụp hiện tại */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tổng tài khoản đăng ký" value={profiles.length.toLocaleString("vi-VN")} icon={UserRound} hint="tất cả tài khoản trên web" href="/admin/students" />
          <StatCard label="Học viên đang học" value={activeStudents.toLocaleString("vi-VN")} icon={GraduationCap}
            hint={`${paidStudents} người có khóa trả phí còn hạn`} href="/admin/students?status=dang-hoc#danh-sach" />
          <StatCard label="Học viên mới ghi danh" value={String(cur.newEnroll)} delta={pct(cur.newEnroll, prev?.newEnroll)} icon={BookOpenCheck} hint="trong kỳ đang xem" href="/admin/students" />
          <StatCard label="Đơn chờ thanh toán" value={String(pendingOrders)} icon={Clock3} hint="khách chưa chuyển khoản" href="/admin/orders?status=pending" />
        </div>

        {/* So sánh tháng / quý / năm */}
        <Card className="mt-6 overflow-hidden">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="size-4" /> So sánh theo {table === "thang" ? "tháng" : table === "quy" ? "quý" : "năm"}</CardTitle>
              <CardDescription>% bên cạnh doanh thu = tăng/giảm so với {table === "thang" ? "tháng" : table === "quy" ? "quý" : "năm"} liền trước</CardDescription>
            </div>
            <div className="bg-muted flex rounded-lg p-1 text-sm">
              {(["thang", "quy", "nam"] as const).map((k) => (
                <Link key={k} href={qsWith({ bang: k })} className={`rounded-md px-3 py-1 font-medium ${table === k ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
                  {k === "thang" ? "Tháng" : k === "quy" ? "Quý" : "Năm"}
                </Link>
              ))}
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-left">
                  <th className="px-4 py-2.5 font-medium">Kỳ</th>
                  <th className="px-4 py-2.5 text-right font-medium">Doanh thu</th>
                  <th className="px-4 py-2.5 text-right font-medium">Đơn đã trả</th>
                  <th className="px-4 py-2.5 text-right font-medium">Tỷ lệ chốt</th>
                  <th className="px-4 py-2.5 text-right font-medium">Tài khoản mới</th>
                  <th className="px-4 py-2.5 text-right font-medium">Học viên mới</th>
                  <th className="px-4 py-2.5 text-right font-medium">Lead mới</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...cmpRows].reverse().map((r, i, arr) => {
                  const before = arr[i + 1]?.m;
                  const d = before ? pct(r.m.revenue, before.revenue) : undefined;
                  return (
                    <tr key={r.label} className="hover:bg-muted/40">
                      <td className="px-4 py-2.5 font-medium">{r.label}</td>
                      <td className="tabular px-4 py-2.5 text-right">
                        {formatVND(r.m.revenue)}
                        {d !== undefined && (r.m.revenue > 0 || before!.revenue > 0) && (
                          <span className={`ml-2 text-xs font-medium ${d >= 0 ? "text-success" : "text-danger"}`}>{d >= 0 ? "▲" : "▼"} {Math.abs(d)}%</span>
                        )}
                      </td>
                      <td className="tabular px-4 py-2.5 text-right">{r.m.paidOrders}</td>
                      <td className="tabular text-muted-foreground px-4 py-2.5 text-right">{r.m.closeRate === null ? "—" : `${r.m.closeRate}%`}</td>
                      <td className="tabular px-4 py-2.5 text-right">{r.m.signups}</td>
                      <td className="tabular px-4 py-2.5 text-right">{r.m.newEnroll}</td>
                      <td className="tabular px-4 py-2.5 text-right">{r.m.leads}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Nguồn khách trong kỳ */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="overflow-hidden lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Lead &amp; đơn đến từ đâu</CardTitle>
                <CardDescription>Theo kênh khách đến, trong kỳ {period.label}</CardDescription>
              </div>
              <Link href="/admin/nguon-khach" className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline">
                Chi tiết nguồn khách <ArrowRight className="size-4" />
              </Link>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-muted-foreground text-left">
                    <th className="px-4 py-2.5 font-medium">Kênh</th>
                    <th className="px-4 py-2.5 text-right font-medium">Lead</th>
                    <th className="px-4 py-2.5 text-right font-medium">Tài khoản mới</th>
                    <th className="px-4 py-2.5 text-right font-medium">Đơn đã trả</th>
                    <th className="px-4 py-2.5 text-right font-medium">Doanh thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {srcRows.length === 0 && (
                    <tr><td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">Chưa có lead, tài khoản hay đơn nào trong kỳ này.</td></tr>
                  )}
                  {srcRows.map((r, i) => (
                    <tr key={r.key} className="hover:bg-muted/40">
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-2 font-medium">
                          <span className="size-2.5 rounded-full" style={{ background: chColor(r.key, i) }} /> {chLabel(r.key)}
                        </span>
                      </td>
                      <td className="tabular px-4 py-2.5 text-right">{r.leads || "—"}</td>
                      <td className="tabular px-4 py-2.5 text-right">{r.signups || "—"}</td>
                      <td className="tabular px-4 py-2.5 text-right">{r.paid || "—"}</td>
                      <td className="tabular px-4 py-2.5 text-right font-medium">{r.revenue ? formatVND(r.revenue) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Nguồn lead</CardTitle></CardHeader>
            <CardContent>
              <LeadsSourceChart data={leadSlices} />
              {orderSlices.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <p className="mb-2 text-sm font-medium">Đơn đã trả theo kênh</p>
                  <ul className="space-y-1.5 text-sm">
                    {orderSlices.map((o) => (
                      <li key={o.source} className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: o.color }} />
                        <span className="flex-1">{o.source}</span>
                        <span className="tabular font-medium">{o.value} đơn</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Biểu đồ 12 tháng */}
        <Card className="mt-6">
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

        {/* Ghi danh + hoạt động */}
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
                  {recent.map((r) => (
                    <li key={r.key}>
                      <Link href={`/admin/students/${r.userId}`} className="hover:bg-muted/40 -mx-2 flex items-center gap-3 rounded-md px-2 py-3">
                        <Avatar name={r.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{r.name}</p>
                          <p className="text-muted-foreground truncate text-xs">{r.course} · {timeAgo(r.at)}</p>
                        </div>
                        <div className="hidden w-32 sm:block">
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="text-muted-foreground">Tiến độ</span>
                            <span className="tabular font-medium">{r.progress}%</span>
                          </div>
                          <Progress value={r.progress} />
                        </div>
                        <Badge tone={r.active ? "info" : "neutral"}><Dot /> {r.active ? "Đang học" : "Hết hạn"}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Hoạt động gần đây</CardTitle></CardHeader>
            <CardContent className="pt-2">
              {activity.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">Chưa có hoạt động.</p>
              ) : (
                <ul className="space-y-4">
                  {activity.map((a) => {
                    const Icon = activityIcon[a.type];
                    return (
                      <li key={a.id} className="flex gap-3">
                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${activityTone[a.type]}`}><Icon className="size-4" /></span>
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
                  <Badge tone={stage.tone} className="h-5 px-2 text-[11px]"><Dot /></Badge>
                  <span className="text-muted-foreground truncate text-xs font-medium">{stage.label}</span>
                </div>
                <p className="tabular mt-2 text-2xl font-semibold">{leads.filter((l) => l.stage === stage.id).length}</p>
              </Card>
            ))}
          </div>
        </div>
      </PageBody>
    </>
  );
}
