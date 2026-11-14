import type { Tone } from "@/lib/types";

export const STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Nháp", tone: "neutral" },
  approved: { label: "Đã duyệt / đang đăng", tone: "info" },
  done: { label: "Đã đăng xong", tone: "success" },
  partial: { label: "Đăng một phần", tone: "warning" },
  failed: { label: "Lỗi", tone: "danger" },
  cancelled: { label: "Đã hủy", tone: "neutral" },
};

export const DELIVERY: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Chờ đăng", tone: "info" },
  scheduled: { label: "Đã hẹn trên Facebook", tone: "info" },
  sent: { label: "Đã đăng", tone: "success" },
  failed: { label: "Lỗi", tone: "danger" },
  manual: { label: "Chờ anh đăng tay", tone: "warning" },
  cancelled: { label: "Đã hủy", tone: "neutral" },
};
