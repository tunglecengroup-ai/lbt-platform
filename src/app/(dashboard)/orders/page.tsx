import { Banknote, Clock3, RotateCcw, Download } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatVND, timeAgo } from "@/lib/utils";
import { orders } from "@/lib/mock-data";
import { orderStatus } from "@/lib/status";

export default function OrdersPage() {
  const paid = orders.filter((o) => o.status === "da-thanh-toan");
  const pending = orders.filter((o) => o.status === "cho-xac-nhan");
  const revenue = paid.reduce((s, o) => s + o.amount, 0);

  return (
    <>
      <Topbar title="Đơn hàng" subtitle="Đối soát thanh toán và doanh thu theo đơn" />
      <PageBody>
        <MobileHeading title="Đơn hàng" subtitle="Đối soát thanh toán" />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Doanh thu đã thu" value={formatVND(revenue)} icon={Banknote} hint={`${paid.length} đơn thành công`} />
          <StatCard label="Chờ xác nhận" value={String(pending.length)} icon={Clock3} hint="cần đối soát ngân hàng" />
          <StatCard label="Hoàn tiền" value={String(orders.filter((o) => o.status === "hoan-tien").length)} icon={RotateCcw} hint="trong tháng" />
        </div>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-base font-semibold">Tất cả đơn hàng</h2>
            <Button variant="outline" size="sm">
              <Download className="size-4" /> Xuất
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-left">
                  <th className="px-4 py-3 font-medium">Mã đơn</th>
                  <th className="px-4 py-3 font-medium">Học viên</th>
                  <th className="px-4 py-3 font-medium">Khóa học</th>
                  <th className="px-4 py-3 font-medium">Thanh toán</th>
                  <th className="px-4 py-3 text-right font-medium">Số tiền</th>
                  <th className="px-4 py-3 font-medium">Thời gian</th>
                  <th className="px-4 py-3 text-right font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o) => {
                  const st = orderStatus[o.status];
                  return (
                    <tr key={o.id} className="hover:bg-muted/50 transition-colors">
                      <td className="tabular px-4 py-3 font-medium">{o.id}</td>
                      <td className="px-4 py-3">{o.student}</td>
                      <td className="text-muted-foreground px-4 py-3">{o.course}</td>
                      <td className="text-muted-foreground px-4 py-3">{o.method}</td>
                      <td className="tabular px-4 py-3 text-right font-semibold">{formatVND(o.amount)}</td>
                      <td className="text-muted-foreground tabular px-4 py-3 text-xs">{timeAgo(o.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge tone={st.tone}>
                          <Dot /> {st.label}
                        </Badge>
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
