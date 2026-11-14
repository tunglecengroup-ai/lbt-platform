/**
 * Chữ "thân thiện" cho anh soạn email: [Tên khách], [Tên khóa học]… thay cho mã {{ten}}, {{khoa_hoc}}…
 * Admin chỉ thấy chữ trong ngoặc vuông; khi lưu tự đổi về mã, khi gửi hệ thống thay bằng dữ liệu thật.
 * Link (vào học, đơn hàng…) chèn bằng nút — đường dẫn nằm ẩn trong link, anh chỉ thấy chữ của link.
 */

export const TEXT_TOKENS: { key: string; label: string }[] = [
  { key: "ten", label: "Tên khách" },
  { key: "khoa_hoc", label: "Tên khóa học" },
  { key: "email", label: "Email khách" },
  { key: "ma_don", label: "Mã đơn" },
  { key: "so_tien", label: "Số tiền" },
  { key: "ngay_het_han", label: "Ngày hết hạn" },
  { key: "goi_thanh_vien", label: "Tên gói Member" },
];

export const LINK_TOKENS: { key: string; label: string; text: string }[] = [
  { key: "link_hoc", label: "Link vào học", text: "Vào học ngay" },
  { key: "link_don_hang", label: "Link thanh toán đơn", text: "Thanh toán đơn hàng" },
  { key: "link_khoa_hoc", label: "Link danh sách khóa học", text: "Xem các khóa học" },
  { key: "link_thanh_vien", label: "Link gói Member", text: "Xem gói LBT Member" },
  { key: "link_chung_nhan", label: "Link nhận chứng nhận", text: "Nhận chứng nhận" },
  { key: "link_trang_chu", label: "Link trang chủ", text: "Học viện Lê Bá Tùng" },
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Mã -> chữ thân thiện (để hiện trong khung soạn). Không đụng vào đường dẫn trong href. */
export function toFriendly(src: string) {
  return src.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, key: string, offset: number, all: string) => {
    // Nằm trong href="..." -> giữ nguyên mã (link ẩn)
    const before = all.slice(Math.max(0, offset - 10), offset);
    if (/href=["']?$/i.test(before)) return m;
    const t = TEXT_TOKENS.find((x) => x.key === key);
    return t ? `[${t.label}]` : m;
  });
}

/** Chữ thân thiện -> mã (khi lưu / khi gửi) */
export function fromFriendly(src: string) {
  let out = src;
  for (const t of TEXT_TOKENS) out = out.replace(new RegExp(`\\[\\s*${esc(t.label)}\\s*\\]`, "gi"), `{{${t.key}}}`);
  return out;
}

/** Lọc HTML dán từ Word/Gmail: bỏ script/style, thuộc tính rác — giữ đoạn, đậm, nghiêng, danh sách, link */
export function cleanEmailHtml(html: string) {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|meta|link)\b[^>]*>/gi, "")
    .replace(/\s(on\w+|style|class|id|data-[\w-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/href\s*=\s*(["'])\s*javascript:[^"']*\1/gi, 'href="#"')
    .replace(/<div>/gi, "<p>")
    .replace(/<\/div>/gi, "</p>")
    .replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "")
    .trim();
}
