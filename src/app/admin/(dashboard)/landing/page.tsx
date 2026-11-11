import Link from "next/link";
import { Eye, ShoppingCart, Banknote, Percent, ExternalLink } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Field, inputClass } from "@/components/ui/field";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { emptyStats, landingStats, listLandings } from "@/lib/landing";
import { formatNumber, formatVND } from "@/lib/utils";
import { createLanding } from "./actions";
import { FunnelCells, FunnelHead, RangeTabs, pct, sinceOf } from "./shared";

export const dynamic = "force-dynamic";

export default async function LandingAdminPage({ searchParams }: PageProps<"/admin/landing">) {
  const sp = await searchParams;
  const range = String(sp.range ?? "30");
  const db = createAdminSupabase();
  const [landings, stats, { data: courses }, { data: plans }] = await Promise.all([
    listLandings(),
    landingStats({ since: sinceOf(range) }),
    db.from("courses").select("id, title").order("position"),
    db.from("membership_plans").select("id, name").order("position"),
  ]);
  const total = [...stats.byLanding.values()].reduce(
    (t, s) => ({ views: t.views + s.views, visitors: t.visitors + s.visitors, started: t.started + s.started, orders: t.orders + s.orders, paid: t.paid + s.paid, revenue: t.revenue + s.revenue }),
    emptyStats(),
  );
  const courseTitle = new Map((courses ?? []).map((c) => [c.id, c.title]));
  const planName = new Map((plans ?? []).map((p) => [p.id, p.name]));

  return (
    <>
      <Topbar title="Trang bán (Landing)" subtitle="Ghép khối như Webcake — mỗi trang đo riêng lượt xem, đơn, doanh thu theo UTM" />
      <PageBody>
        <MobileHeading title="Trang bán" />
        <div className="mb-4"><RangeTabs current={range} base="/admin/landing" /></div>
        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="Người xem" value={formatNumber(total.visitors)} icon={Eye} hint={`${formatNumber(total.views)} lượt xem`} />
          <StatCard label="Đơn tạo" value={formatNumber(total.orders)} icon={ShoppingCart} hint={`${formatNumber(total.started)} người bắt đầu điền form`} />
          <StatCard label="Doanh thu đã trả" value={formatVND(total.revenue)} icon={Banknote} hint={`${total.paid} đơn đã trả tiền`} />
          <StatCard label="Tỉ lệ ra đơn" value={pct(total.orders, total.visitors)} icon={Percent} hint={`trả tiền ${pct(total.paid, total.orders)}`} />
        </div>

        <Card className="mb-6 overflow-hidden">
          <CardHeader>
            <div>
              <CardTitle>Các trang bán ({landings.length})</CardTitle>
              <CardDescription>Bấm tên trang để sửa khối và xem số liệu theo chiến dịch / quảng cáo.</CardDescription>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <FunnelHead first="Trang" />
              <tbody className="divide-y">
                {landings.length === 0 && (
                  <tr><td colSpan={9} className="text-muted-foreground px-3 py-8 text-center">Chưa có trang nào — tạo trang đầu tiên ở dưới.</td></tr>
                )}
                {landings.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/landing/${l.id}`} className="font-medium hover:underline">{l.name}</Link>
                      <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                        {l.is_published ? <Badge tone="success"><Dot /> Đang chạy</Badge> : <Badge tone="neutral"><Dot /> Nháp</Badge>}
                        <span>{l.plan_id ? `Gói: ${planName.get(l.plan_id) ?? "?"}` : courseTitle.get(l.course_id ?? "") ?? "Chưa gắn khóa"}</span>
                        <a href={`/l/${l.slug}`} target="_blank" className="text-primary inline-flex items-center gap-0.5">/l/{l.slug} <ExternalLink className="size-3" /></a>
                      </div>
                    </td>
                    <FunnelCells s={stats.byLanding.get(l.id) ?? emptyStats()} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tạo trang bán mới</CardTitle></CardHeader>
          <CardContent>
            <form action={createLanding} className="grid gap-4 sm:grid-cols-2">
              <Field label="Tên trang (nội bộ)" hint="vd: ADS cơ bản - bản A"><input name="name" required className={inputClass} /></Field>
              <Field label="Đường dẫn" hint="hoc.lebatung.com/l/<đường-dẫn> — để trống tự tạo từ tên"><input name="slug" className={inputClass} /></Field>
              <Field label="Bán khóa / gói nào" className="sm:col-span-2">
                <select name="target" required className={inputClass} defaultValue="">
                  <option value="" disabled>— Chọn —</option>
                  <optgroup label="Khóa học">
                    {(courses ?? []).map((c) => <option key={c.id} value={`course:${c.id}`}>{c.title}</option>)}
                  </optgroup>
                  {(plans ?? []).length > 0 && (
                    <optgroup label="Gói thành viên">
                      {(plans ?? []).map((p) => <option key={p.id} value={`plan:${p.id}`}>{p.name}</option>)}
                    </optgroup>
                  )}
                </select>
              </Field>
              <p className="text-muted-foreground text-sm sm:col-span-2">
                Trang mới có sẵn 9 khối mẫu (đầu trang, nỗi đau, lợi ích, nội dung khóa, giảng viên, cảm nhận, bảng giá, hỏi đáp, form đăng ký) điền từ thông tin khóa. Trang ở chế độ nháp tới khi anh bật &quot;Xuất bản&quot;.
              </p>
              <div className="sm:col-span-2"><Button type="submit">Tạo trang</Button></div>
            </form>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
