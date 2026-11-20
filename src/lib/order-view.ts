import { CHANNELS, type Channel } from "@/lib/channels";
import type { OrderRow, Tone } from "@/lib/types";

/** Nhãn trạng thái đơn (Admin) */
export const statusView: Record<OrderRow["status"], { label: string; tone: Tone }> = {
  pending: { label: "Chờ thanh toán", tone: "warning" },
  paid: { label: "Đã thanh toán", tone: "success" },
  cancelled: { label: "Đã hủy", tone: "neutral" },
  refunded: { label: "Hoàn tiền", tone: "danger" },
};

export const methodLabel: Record<string, string> = { sepay: "QR tự động", manual: "Admin xác nhận", free: "Miễn phí" };

/** Tên + màu kênh nguồn của đơn */
export const channelName = (c: string | null | undefined) => (c && c in CHANNELS ? CHANNELS[c as Channel].label : "Chưa ghi nguồn");
export const channelColor = (c: string | null | undefined) => (c && c in CHANNELS ? CHANNELS[c as Channel].color : "#cbd5e1");
