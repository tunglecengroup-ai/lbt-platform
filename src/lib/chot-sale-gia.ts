import { listPublishedCourses } from "@/lib/courses";
import { siteUrl } from "@/lib/site";
import { formatVND } from "@/lib/utils";

/**
 * Giá + thông tin khóa học lấy thẳng từ website (bảng courses) cho agent chốt sale.
 * Dùng chung: /api/tro-ly (chat web) và /api/khoa-hoc (agent fanpage đọc qua mạng).
 */
export type KhoaHocGia = {
  slug: string;
  ten: string;
  gia_vnd: number;
  gia_goc_vnd: number | null;
  so_bai: number;
  so_gio: number;
  thoi_han_ngay: number | null;
  mo_ta: string | null;
  hoc_xong: string[];
  link: string;
};

let cache: { at: number; data: KhoaHocGia[] } | null = null;

export async function khoaHocGia(): Promise<KhoaHocGia[]> {
  if (cache && Date.now() - cache.at < 600_000) return cache.data;
  const courses = await listPublishedCourses();
  const data = courses.map((c) => ({
    slug: c.slug,
    ten: c.title,
    gia_vnd: c.price_vnd,
    gia_goc_vnd: c.compare_price_vnd && c.compare_price_vnd > c.price_vnd ? c.compare_price_vnd : null,
    so_bai: c.lessonCount,
    so_gio: Math.round((c.totalSec / 3600) * 10) / 10,
    thoi_han_ngay: c.access_days,
    mo_ta: c.subtitle,
    hoc_xong: (c.outcomes ?? []).slice(0, 8),
    link: `${siteUrl}/khoa-hoc/${c.slug}`,
  }));
  cache = { at: Date.now(), data };
  return data;
}

/** Khối chữ đưa vào não agent */
export function giaThanhChu(list: KhoaHocGia[]) {
  if (!list.length) return "GIÁ TRÊN WEBSITE: (chưa đọc được — không báo giá, nói em kiểm tra lại và mời xem trang khóa học)";
  const lines = list.map(
    (k) =>
      `- ${k.ten} (mã ${k.slug}): ${k.gia_vnd ? formatVND(k.gia_vnd) : "Miễn phí"}${k.gia_goc_vnd ? `, giá gốc ${formatVND(k.gia_goc_vnd)}` : ""}. ${k.so_bai} bài, khoảng ${k.so_gio} giờ video${k.thoi_han_ngay ? `, xem ${Math.round(k.thoi_han_ngay / 30)} tháng` : ""}. ${k.mo_ta ?? ""}${k.hoc_xong.length ? ` Học xong: ${k.hoc_xong.join("; ")}.` : ""} Link: ${k.link}`,
  );
  return `GIÁ VÀ KHÓA HỌC TRÊN WEBSITE (dữ liệu thật, đọc lúc ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}):\n${lines.join("\n")}`;
}
