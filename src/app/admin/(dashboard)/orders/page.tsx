import Link from "next/link";
import { Banknote, Clock3, AlertTriangle, Plus, Filter } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { ConfirmButton } from "@/components/confirm-button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { formatVND, timeAgo } from "@/lib/utils";
import type { OrderRow } from "@/lib/types";
import { channelColor, channelName, methodLabel, statusView } from "@/lib/order-view";
import { cancelOrder, markOrderPaid } from "./actions";

export const dynamic = "force-dynamic";

type OrderListRow = OrderRow & {
  courses: { title: string } | null;
  membership_plans: { name: string } | null;
  channel: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  landing_id: string | null;
};

const selectClass = "bg-background focus:border-primary h-9 rounded-md border px-2 text-sm outline-none";

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const fStatus = typeof sp.status === "string" ? sp.status : "";
  const fChannel = typeof sp.channel === "string" ? sp.channel : "";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";

  const db = createAdminSupabase();
  const [{ data }, { data: unmatched }] = await Promise.all([
    db.from("orders").select("*, courses(title), membership_plans(name)").order("created_at", { ascending: false }).limit(1000),
    db.from("payment_events").select("id, amount_vnd, content, result, created_at")
      .in("result", ["no_order", "amount_mismatch"]).order("created_at", { ascending: false }).limit(20),
  ]);
  const all = (data ?? []) as OrderListRow[];
  const paid = all.filter((o) => o.status === "paid");
  const pending = all.filter((o) => o.status === "pending");
  const now = new Date();

  const orders = all.filter((o) => {
    if (fStatus && o.status !== fStatus) return false;
    if (fChannel === "none" ? !!o.channel : fChannel && o.channel !== fChannel) return false;
    if (q && !`${o.code} ${o.customer_name} ${o.customer_email} ${o.customer_phone}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const channelsUsed = [...new Set(all.map((o) => o.channel).filter(Boolean) as string[])];

  return (
    <>
      <Topbar title="Đơn hàng" subtitle="Đơn tự đối soát qua SePay — bấm vào đơn để xem chi tiết, sửa, xóa" />
      <PageBody>
        <MobileHeading title="Đơn hàng" subtitle="Đối soát thanh toán" />
        {sp.deleted === "1" && <p className="bg-success-soft text-success mb-4 rounded-md px-4 py-2 text-sm font-medium">Đã xóa đơn hàng.</p>}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Doanh thu đã thu" value={formatVND(paid.reduce((s, o) => s + o.amount_vnd, 0))} icon={Banknote} hint={`${paid.length} đơn thành công`}
            href="/admin/orders?status=paid" active={fStatus === "paid"} />
          <StatCard label="Chờ thanh toán" value={String(pending.length)} icon={Clock3} hint="khách chưa chuyển khoản"
            href="/admin/orders?status=pending" active={fStatus === "pending"} />
          <StatCard label="Tiền vào chưa khớp đơn" value={String(unmatched?.length ?? 0)} icon={AlertTriangle} hint="sai nội dung / thiếu tiền" />
        </div>

        {unmatched && unmatched.length > 0 && (
          <Card className="border-warning/30 mb-6 overflow-hidden">
            <p className="bg-warning-soft text-warning border-b px-4 py-2.5 text-sm font-semibold">
              Giao dịch ngân hàng chưa khớp đơn — tìm đơn tương ứng bên dưới rồi bấm “Xác nhận”
            </p>
            <ul className="divide-y text-sm">
              {unmatched.map((e) => (
                <li key={e.id} className="flex flex-wrap gap-3 px-4 py-2.5">
                  <span className="tabular font-semibold">{formatVND(e.amount_vnd)}</span>
                  <span className="text-muted-foreground flex-1">{e.content}</span>
                  <Badge tone="warning">{e.result === "amount_mismatch" ? "Thiếu tiền" : "Không thấy mã đơn"}</Badge>
                  <span className="text-muted-foreground text-xs">{timeAgo(e.created_at, now)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <h2 className="text-base font-semibold">Tất cả đơn hàng ({orders.length})</h2>
            <form className="ml-auto flex flex-wrap items-center gap-2">
              <input name="q" defaultValue={q} placeholder="Mã đơn, tên, email, SĐT…" className={`${selectClass} w-48 px-3`} />
              <select name="status" defaultValue={fStatus} className={selectClass} aria-label="Trạng thái">
                <option value="">Mọi trạng thái</option>
                {Object.entries(statusView).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select name="channel" defaultValue={fChannel} className={selectClass} aria-label="Nguồn">
                <option value="">Mọi nguồn</option>
                {channelsUsed.map((c) => <option key={c} value={c}>{channelName(c)}</option>)}
                <option value="none">Chưa ghi nguồn</option>
              </select>
              <Button type="submit" size="sm" variant="outline"><Filter className="size-4" /> Lọc</Button>
            </form>
            <Button asChild size="sm"><Link href="/admin/orders/moi"><Plus className="size-4" /> Tạo đơn</Link></Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-left">
                  <th className="px-4 py-3 font-medium">Mã đơn</th>
                  <th className="px-4 py-3 font-medium">Khách</th>
                  <th className="px-4 py-3 font-medium">Khóa học / gói</th>
                  <th className="px-4 py-3 font-medium">Nguồn</th>
                  <th className="px-4 py-3 text-right font-medium">Số tiền</th>
                  <th className="px-4 py-3 font-medium">Thời gian</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.length === 0 && (
                  <tr><td colSpan={8} className="text-muted-foreground px-4 py-8 text-center">Không có đơn nào khớp</td></tr>
                )}
                {orders.map((o) => {
                  const st = statusView[o.status];
                  const href = `/admin/orders/${o.id}`;
                  return (
                    <tr key={o.id} className="hover:bg-muted/50 transition-colors">
                      <td className="tabular px-4 py-3 font-medium">
                        <Link href={href} className="text-primary hover:underline">{o.code}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={href} className="block hover:underline">
                          <p className="font-medium">{o.customer_name}</p>
                          <p className="text-muted-foreground text-xs">{o.customer_email} · {o.customer_phone}</p>
                        </Link>
                      </td>
                      <td className="text-muted-foreground px-4 py-3">{o.courses?.title ?? o.membership_plans?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                          <span className="size-2 rounded-full" style={{ background: channelColor(o.channel) }} />
                          {channelName(o.channel)}
                        </span>
                        {(o.utm_campaign || o.landing_id) && (
                          <p className="text-muted-foreground mt-0.5 max-w-40 truncate text-[11px]">{o.utm_campaign ?? "Trang bán"}{o.utm_content ? ` · ${o.utm_content}` : ""}</p>
                        )}
                      </td>
                      <td className="tabular px-4 py-3 text-right font-semibold">{formatVND(o.amount_vnd)}</td>
                      <td className="text-muted-foreground tabular px-4 py-3 text-xs">{timeAgo(o.created_at, now)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={st.tone}><Dot /> {st.label}</Badge>
                        {o.payment_method && <p className="text-muted-foreground mt-1 text-xs">{methodLabel[o.payment_method] ?? o.payment_method}</p>}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1">
                          {o.status === "pending" && (
                            <>
                              <form action={markOrderPaid}>
                                <input type="hidden" name="id" value={o.id} />
                                <ConfirmButton size="sm" message={`Xác nhận đã nhận ${formatVND(o.amount_vnd)} cho đơn ${o.code}? Khóa học sẽ được mở cho ${o.customer_email}.`}>Xác nhận</ConfirmButton>
                              </form>
                              <form action={cancelOrder}>
                                <input type="hidden" name="id" value={o.id} />
                                <Button type="submit" size="sm" variant="ghost">Hủy</Button>
                              </form>
                            </>
                          )}
                          <Button asChild size="sm" variant="ghost"><Link href={href}>Chi tiết</Link></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </PageBody>
    </>
  );
}
