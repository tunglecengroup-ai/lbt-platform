import { Banknote, Clock3, AlertTriangle } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { ConfirmButton } from "@/components/confirm-button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { formatVND, timeAgo } from "@/lib/utils";
import type { Tone } from "@/lib/mock-data";
import type { OrderRow } from "@/lib/types";
import { cancelOrder, markOrderPaid } from "./actions";

const statusView: Record<OrderRow["status"], { label: string; tone: Tone }> = {
  pending: { label: "Chờ thanh toán", tone: "warning" },
  paid: { label: "Đã thanh toán", tone: "success" },
  cancelled: { label: "Đã hủy", tone: "neutral" },
  refunded: { label: "Hoàn tiền", tone: "danger" },
};

const methodLabel: Record<string, string> = { sepay: "QR tự động", manual: "Admin xác nhận", free: "Miễn phí" };

export default async function OrdersPage() {
  const db = createAdminSupabase();
  const [{ data }, { data: unmatched }] = await Promise.all([
    db.from("orders").select("*, courses(title)").order("created_at", { ascending: false }).limit(300),
    db.from("payment_events").select("id, amount_vnd, content, result, created_at")
      .in("result", ["no_order", "amount_mismatch"]).order("created_at", { ascending: false }).limit(20),
  ]);
  const orders = (data ?? []) as (OrderRow & { courses: { title: string } | null })[];
  const paid = orders.filter((o) => o.status === "paid");
  const pending = orders.filter((o) => o.status === "pending");
  const now = new Date();

  return (
    <>
      <Topbar title="Đơn hàng" subtitle="Đơn tự đối soát qua SePay — chỉ cần xử lý tay các khoản lệch" />
      <PageBody>
        <MobileHeading title="Đơn hàng" subtitle="Đối soát thanh toán" />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Doanh thu đã thu" value={formatVND(paid.reduce((s, o) => s + o.amount_vnd, 0))} icon={Banknote} hint={`${paid.length} đơn thành công`} />
          <StatCard label="Chờ thanh toán" value={String(pending.length)} icon={Clock3} hint="khách chưa chuyển khoản" />
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
          <div className="border-b p-4"><h2 className="text-base font-semibold">Tất cả đơn hàng</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-left">
                  <th className="px-4 py-3 font-medium">Mã đơn</th>
                  <th className="px-4 py-3 font-medium">Khách</th>
                  <th className="px-4 py-3 font-medium">Khóa học</th>
                  <th className="px-4 py-3 text-right font-medium">Số tiền</th>
                  <th className="px-4 py-3 font-medium">Thời gian</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.length === 0 && (
                  <tr><td colSpan={7} className="text-muted-foreground px-4 py-8 text-center">Chưa có đơn nào</td></tr>
                )}
                {orders.map((o) => {
                  const st = statusView[o.status];
                  return (
                    <tr key={o.id} className="hover:bg-muted/50 transition-colors">
                      <td className="tabular px-4 py-3 font-medium">{o.code}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{o.customer_name}</p>
                        <p className="text-muted-foreground text-xs">{o.customer_email} · {o.customer_phone}</p>
                      </td>
                      <td className="text-muted-foreground px-4 py-3">{o.courses?.title}</td>
                      <td className="tabular px-4 py-3 text-right font-semibold">{formatVND(o.amount_vnd)}</td>
                      <td className="text-muted-foreground tabular px-4 py-3 text-xs">{timeAgo(o.created_at, now)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={st.tone}><Dot /> {st.label}</Badge>
                        {o.payment_method && <p className="text-muted-foreground mt-1 text-xs">{methodLabel[o.payment_method] ?? o.payment_method}</p>}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {o.status === "pending" && (
                          <div className="flex justify-end gap-1">
                            <form action={markOrderPaid}>
                              <input type="hidden" name="id" value={o.id} />
                              <ConfirmButton size="sm" message={`Xác nhận đã nhận ${formatVND(o.amount_vnd)} cho đơn ${o.code}? Khóa học sẽ được mở cho ${o.customer_email}.`}>Xác nhận</ConfirmButton>
                            </form>
                            <form action={cancelOrder}>
                              <input type="hidden" name="id" value={o.id} />
                              <Button type="submit" size="sm" variant="ghost">Hủy</Button>
                            </form>
                          </div>
                        )}
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
