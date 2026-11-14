/** Giờ đăng bài blog — mọi ô nhập/hiển thị theo giờ Việt Nam (UTC+7) */

const VN = 7 * 3_600_000;

/** ISO -> "yyyy-mm-ddThh:mm" giờ VN (giá trị cho ô datetime-local) */
export const vnLocal = (iso: string | null | undefined) => (iso ? new Date(new Date(iso).getTime() + VN).toISOString().slice(0, 16) : "");

/** ISO -> "20:00 · 15/11/2026" giờ VN */
export function vnDateTime(iso: string) {
  const [d, t] = vnLocal(iso).split("T");
  const [y, m, day] = d.split("-");
  return `${t} · ${day}/${m}/${y}`;
}

/**
 * Giá trị ô "Ngày giờ đăng" -> ISO
 *  - để trống          -> ngay bây giờ
 *  - không đổi so với cũ -> giữ nguyên giờ cũ (khỏi lệch giây)
 *  - còn lại            -> đúng ngày giờ đã chọn (tương lai = hẹn giờ đăng)
 */
export function publishTime(value: string, original?: string | null) {
  if (!value) return new Date().toISOString();
  if (original && value === vnLocal(original)) return original;
  const v = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T08:00` : value; // chỉ có ngày -> 8h sáng
  const d = new Date(`${v}:00+07:00`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
