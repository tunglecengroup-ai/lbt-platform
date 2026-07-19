import type { Tone, Student, Order } from "@/lib/mock-data";

export const studentStatus: Record<Student["status"], { label: string; tone: Tone }> = {
  "dang-hoc": { label: "Đang học", tone: "info" },
  "hoan-thanh": { label: "Hoàn thành", tone: "success" },
  "nguy-co": { label: "Nguy cơ bỏ", tone: "warning" },
  "bo-hoc": { label: "Đã bỏ học", tone: "danger" },
};

export const orderStatus: Record<Order["status"], { label: string; tone: Tone }> = {
  "da-thanh-toan": { label: "Đã thanh toán", tone: "success" },
  "cho-xac-nhan": { label: "Chờ xác nhận", tone: "warning" },
  "hoan-tien": { label: "Hoàn tiền", tone: "danger" },
};

export const courseStatus: Record<string, { label: string; tone: Tone }> = {
  "dang-ban": { label: "Đang bán", tone: "success" },
  "sap-mo": { label: "Sắp mở", tone: "info" },
  dong: { label: "Đã đóng", tone: "neutral" },
};
