import Link from "next/link";
import { ArrowLeft, Eye, UserPlus, ShoppingCart, Banknote, Trash2 } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ConfirmButton } from "@/components/confirm-button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { CHANNELS, type Channel } from "@/lib/channels";
import { UNTRACKED, emptySource, linkStats, sourceStats, type SourceRow } from "@/lib/source-stats";
import { formatNumber, formatVND } from "@/lib/utils";
import { RangeTabs, pct, sinceOf } from "../landing/shared";
import { CopyField } from "../landing/[id]/editor-client";
import { TrackingLinkForm } from "./link-form";
import { deleteTrackingLink } from "./actions";

export const dynamic = "force-dynamic";

const label = (k: string) => (k === UNTRACKED ? "Chưa ghi nguồn (đơn trước khi bật đo)" : CHANNELS[k as Channel]?.label ?? k);

function Head({ first }: { first: string }) {
  return (
    <thead className="bg-muted/50 text-muted-foreground text-xs">
      <tr>
        <th className="px-3 py-2.5 text-left font-medium">{first}</th>
        <th className="px-3 py-2.5 text-right font-medium" title="Số phiên ghé web (1 lần/phiên)">Lượt ghé</th>
        <th className="px-3 py-2.5 text-right font-medium" title="Thiết bị lần đầu ghé web">Khách mới</th>
        <th className="px-3 py-2.5 text-right font-medium" title="Tài khoản học viên tạo mới (theo kênh khách biết tới web lần đầu)">Đăng ký TK</th>
        <th className="px-3 py-2.5 text-right font-medium">Đơn tạo</th>
        <th className="px-3 py-2.5 text-right font-medium">Đã trả</th>
        <th className="px-3 py-2.5 text-right font-medium" title="Đơn đã trả, tính cho kênh khách đến ngay trước khi mua">Doanh thu</th>
        <th className="px-3 py-2.5 text-right font-medium" title="Đơn đã trả, tính cho kênh khách BIẾT TỚI web lần đầu">DT theo kênh đầu</th>
        <th className="px-3 py-2.5 text-right font-medium" title="Đơn tạo / lượt ghé">Tỉ lệ ra đơn</th>
      </tr>
    </thead>
  );
}

function Cells({ r }: { r: SourceRow }) {
  const td = "tabular px-3 py-2.5 text-right";
  return (
    <>
      <td className={td}>{formatNumber(r.visits)}</td>
      <td className={td}>{formatNumber(r.newVisitors)}</td>
      <td className={td}>{formatNumber(r.signups)}</td>
      <td className={td}>{formatNumber(r.orders)}</td>
      <td className={`${td} font-semibold`}>{formatNumber(r.paid)}</td>
      <td className={`${td} font-semibold`}>{formatVND(r.revenue)}</td>
      <td className={td}>{formatVND(r.firstRevenue)}</td>
      <td className={td}>{pct(r.orders, r.visits)}</td>
    </>
  );
}

function Breakdown({ title, hint, data }: { title: string; hint: string; data: Map<string, SourceRow> }) {
  const rows = [...data].sort((a, b) => b[1].revenue - a[1].revenue || b[1].orders - a[1].orders || b[1].visits - a[1].visits);
  return (
    <Card className="overflow-hidden">
      <CardHeader><div><CardTitle>{title}</CardTitle><CardDescription>{hint}</CardDescription></div></CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <Head first={title} />
          <tbody className="divide-y">
            {rows.length === 0 && <tr><td colSpan={9} className="text-muted-foreground px-3 py-6 text-center">Chưa có số liệu</td></tr>}
            {rows.slice(0, 50).map(([k, r]) => <tr key={k}><td className="max-w-72 truncate px-3 py-2.5 font-medium" title={k}>{k}</td><Cells r={r} /></tr>)}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default async function SourcesPage({ searchParams }: PageProps<"/admin/nguon-khach">) {
  const sp = await searchParams;
  const range = String(sp.range ?? "30");
  const channel = typeof sp.channel === "string" && sp.channel in CHANNELS ? sp.channel : "";
  const since = sinceOf(range);
  const db = createAdminSupabase();
  const [stats, { data: links }, { data: courses }, { data: landings }] = await Promise.all([
    sourceStats({ since, channel: channel || undefined }),
    db.from("tracking_links").select("*").order("created_at", { ascending: false }).limit(100),
    db.from("courses").select("slug, title").eq("is_published", true).order("position"),
    db.from("landing_pages").select("slug, name").eq("is_published", true).order("created_at", { ascending: false }),
  ]);

  const rows = [...stats.byChannel].sort((a, b) => b[1].revenue - a[1].revenue || b[1].visits - a[1].visits);
  const total = rows.reduce((t, [, r]) => ({ ...t, visits: t.visits + r.visits, newVisitors: t.newVisitors + r.newVisitors, signups: t.signups + r.signups, orders: t.orders + r.orders, paid: t.paid + r.paid, revenue: t.revenue + r.revenue }), emptySource());
  const targets = [
    { label: "Trang chủ", path: "/" },
    ...(courses ?? []).map((c) => ({ label: `Khóa: ${c.title}`, path: `/khoa-hoc/${c.slug}` })),
    ...(landings ?? []).map((l) => ({ label: `Trang bán: ${l.name}`, path: `/l/${l.slug}` })),
    { label: "Gói thành viên", path: "/thanh-vien" },
    { label: "Blog", path: "/blog" },
    { label: "Đăng ký tài khoản", path: "/hoc/dang-ky" },
  ];
  const base = `/admin/nguon-khach${channel ? `?channel=${channel}&` : "?"}`;

  return (
    <>
      <Topbar title="Nguồn khách" subtitle="Khách đến từ kênh nào: Facebook, TikTok, YouTube, Instagram, Threads, LinkedIn, Zalo, email, Google…" />
      <PageBody>
        <MobileHeading title="Nguồn khách" />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {channel && (
            <Link href={`/admin/nguon-khach?range=${range}`} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"><ArrowLeft className="size-4" /> Tất cả kênh</Link>
          )}
          <RangeTabs current={range} base={base.replace(/[?&]$/, "")} />
        </div>

        {!channel ? (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
              <StatCard label="Lượt ghé web" value={formatNumber(total.visits)} icon={Eye} hint={`${formatNumber(total.newVisitors)} khách mới`} />
              <StatCard label="Tài khoản mới" value={formatNumber(total.signups)} icon={UserPlus} hint="có ghi nhận nguồn" />
              <StatCard label="Đơn tạo" value={formatNumber(total.orders)} icon={ShoppingCart} hint={`tỉ lệ ra đơn ${pct(total.orders, total.visits)}`} />
              <StatCard label="Doanh thu đã trả" value={formatVND(total.revenue)} icon={Banknote} hint={`${total.paid} đơn`} />
            </div>
            <Card className="mb-6 overflow-hidden">
              <CardHeader><div><CardTitle>Theo kênh</CardTitle><CardDescription>Bấm tên kênh để xem từng chiến dịch, từng bài.</CardDescription></div></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <Head first="Kênh" />
                  <tbody className="divide-y">
                    {rows.length === 0 && <tr><td colSpan={9} className="text-muted-foreground px-3 py-8 text-center">Chưa có số liệu — số liệu bắt đầu ghi từ khi bản cập nhật này lên web.</td></tr>}
                    {rows.map(([k, r]) => (
                      <tr key={k} className="hover:bg-muted/40">
                        <td className="px-3 py-2.5">
                          <Link href={`/admin/nguon-khach?channel=${k}&range=${range}`} className="inline-flex items-center gap-2 font-medium hover:underline">
                            <span className="size-2.5 rounded-full" style={{ background: CHANNELS[k as Channel]?.color ?? "#999" }} />
                            {label(k)}
                          </Link>
                        </td>
                        <Cells r={r} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : (
          <div className="mb-6 space-y-6">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <Head first="Kênh" />
                  <tbody><tr><td className="px-3 py-2.5 font-semibold">{label(channel)}</td><Cells r={stats.byChannel.get(channel) ?? emptySource()} /></tr></tbody>
                </table>
              </div>
            </Card>
            <Breakdown title="Chiến dịch" hint="Theo utm_campaign" data={stats.byCampaign} />
            <Breakdown title="Bài / nội dung" hint="Theo utm_content — bài đăng, video, mẫu quảng cáo cụ thể" data={stats.byContent} />
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader><div><CardTitle>Tạo link theo dõi</CardTitle><CardDescription>Mỗi bài đăng một link riêng → biết bài nào, kênh nào ra khách.</CardDescription></div></CardHeader>
            <CardContent><TrackingLinkForm targets={targets} /></CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader><div><CardTitle>Link đã tạo ({links?.length ?? 0})</CardTitle><CardDescription>Số liệu trong khoảng thời gian đang chọn.</CardDescription></div></CardHeader>
            <ul className="divide-y text-sm">
              {(links ?? []).length === 0 && <li className="text-muted-foreground px-5 py-6 text-center">Chưa có link</li>}
              {(links ?? []).map((l) => {
                const s = linkStats(l, stats);
                return (
                  <li key={l.id} className="space-y-2 px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: CHANNELS[l.channel as Channel]?.color ?? "#999" }} />
                      <span className="font-medium">{label(l.channel)}</span>
                      <span className="text-muted-foreground text-xs">{l.utm_campaign}{l.utm_content ? ` / ${l.utm_content}` : ""}{l.name ? ` · ${l.name}` : ""}</span>
                      <span className="text-muted-foreground ml-auto text-xs tabular">{s.visits} ghé · {s.orders} đơn · {formatVND(s.revenue)}</span>
                      <form action={deleteTrackingLink}>
                        <input type="hidden" name="id" value={l.id} />
                        <ConfirmButton variant="ghost" size="sm" message="Xóa link này khỏi danh sách? (Link đã đăng vẫn chạy, số liệu vẫn ghi)" aria-label="Xóa"><Trash2 className="size-3.5" /></ConfirmButton>
                      </form>
                    </div>
                    <CopyField label="" value={l.full_url} />
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
