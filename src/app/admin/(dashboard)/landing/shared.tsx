import Link from "next/link";
import type { FunnelStats } from "@/lib/landing";
import { formatNumber, formatVND } from "@/lib/utils";

export const RANGES = [
  { key: "1", label: "Hôm nay" },
  { key: "7", label: "7 ngày" },
  { key: "30", label: "30 ngày" },
  { key: "90", label: "90 ngày" },
  { key: "all", label: "Tất cả" },
] as const;

/** Mốc bắt đầu theo giờ VN (1 = từ 0h hôm nay) */
export function sinceOf(range: string) {
  if (range === "all") return "";
  const days = Number(range) || 30;
  const vn = new Date(Date.now() + 7 * 3600_000);
  vn.setUTCHours(0, 0, 0, 0);
  return new Date(vn.getTime() - 7 * 3600_000 - (days - 1) * 86_400_000).toISOString();
}

export function RangeTabs({ current, base }: { current: string; base: string }) {
  return (
    <div className="bg-muted inline-flex flex-wrap rounded-lg p-1 text-sm">
      {RANGES.map((r) => (
        <Link
          key={r.key}
          href={`${base}?range=${r.key}`}
          className={`rounded-md px-3 py-1.5 font-medium ${current === r.key ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}

export const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");

/** Cột số của phễu: Xem → Người xem → Bắt đầu điền → Đơn → Đã trả → Doanh thu → Tỉ lệ */
export function FunnelCells({ s }: { s: FunnelStats }) {
  return (
    <>
      <td className="tabular px-3 py-2.5 text-right">{formatNumber(s.views)}</td>
      <td className="tabular px-3 py-2.5 text-right">{formatNumber(s.visitors)}</td>
      <td className="tabular px-3 py-2.5 text-right">{formatNumber(s.started)}</td>
      <td className="tabular px-3 py-2.5 text-right">{formatNumber(s.orders)}</td>
      <td className="tabular px-3 py-2.5 text-right font-semibold">{formatNumber(s.paid)}</td>
      <td className="tabular px-3 py-2.5 text-right font-semibold">{formatVND(s.revenue)}</td>
      <td className="tabular px-3 py-2.5 text-right">{pct(s.orders, s.visitors)}</td>
      <td className="tabular px-3 py-2.5 text-right">{pct(s.paid, s.orders)}</td>
    </>
  );
}

export function FunnelHead({ first }: { first: string }) {
  return (
    <thead className="bg-muted/50 text-muted-foreground text-xs">
      <tr>
        <th className="px-3 py-2.5 text-left font-medium">{first}</th>
        <th className="px-3 py-2.5 text-right font-medium" title="Tổng lượt mở trang (1 lượt/phiên)">Lượt xem</th>
        <th className="px-3 py-2.5 text-right font-medium" title="Số người (thiết bị) khác nhau">Người xem</th>
        <th className="px-3 py-2.5 text-right font-medium" title="Bấm vào form đăng ký">Bắt đầu điền</th>
        <th className="px-3 py-2.5 text-right font-medium">Đơn tạo</th>
        <th className="px-3 py-2.5 text-right font-medium">Đã trả tiền</th>
        <th className="px-3 py-2.5 text-right font-medium">Doanh thu</th>
        <th className="px-3 py-2.5 text-right font-medium" title="Đơn tạo / người xem">Tỉ lệ ra đơn</th>
        <th className="px-3 py-2.5 text-right font-medium" title="Đã trả / đơn tạo">Tỉ lệ trả tiền</th>
      </tr>
    </thead>
  );
}
