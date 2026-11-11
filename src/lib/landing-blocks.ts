/**
 * Định nghĩa các KHỐI của trang bán (dùng chung cho Admin soạn + trang công khai hiển thị).
 * Mỗi khối = { id, type, data } lưu trong landing_pages.sections (jsonb).
 */

export type FieldKind = "text" | "textarea" | "lines" | "url" | "datetime";
export type BlockField = { key: string; label: string; kind: FieldKind; hint?: string };

const BLOCK_DEFS = {
  hero: {
    label: "Đầu trang (tiêu đề + video)",
    fields: [
      { key: "badge", label: "Dòng nhỏ trên tiêu đề", kind: "text", hint: "vd: KHÓA HỌC ONLINE · HỌC MỌI LÚC" },
      { key: "headline", label: "Tiêu đề lớn", kind: "textarea" },
      { key: "subheadline", label: "Câu phụ", kind: "textarea" },
      { key: "video", label: "Video YouTube", kind: "url", hint: "Dán link YouTube — để trống thì hiện ảnh" },
      { key: "image", label: "Ảnh (link)", kind: "url", hint: "Để trống = ảnh bìa khóa học" },
      { key: "cta_text", label: "Chữ trên nút", kind: "text" },
    ],
  },
  pain: {
    label: "Nỗi đau khách hàng",
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "items", label: "Các nỗi đau (mỗi dòng 1 ý)", kind: "lines" },
      { key: "closing", label: "Câu chốt", kind: "textarea" },
    ],
  },
  benefits: {
    label: "Lợi ích / học được gì",
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "items", label: "Lợi ích (mỗi dòng 1 ý, có thể dạng: Tiêu đề | mô tả)", kind: "lines", hint: "Để trống = lấy mục \"Bạn sẽ học được\" của khóa" },
    ],
  },
  video: {
    label: "Video",
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "video", label: "Video YouTube", kind: "url" },
      { key: "caption", label: "Chú thích", kind: "textarea" },
    ],
  },
  curriculum: {
    label: "Nội dung khóa học (tự lấy mục lục)",
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "note", label: "Ghi chú dưới tiêu đề", kind: "textarea" },
    ],
  },
  instructor: {
    label: "Giảng viên",
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "name", label: "Tên", kind: "text" },
      { key: "bio", label: "Giới thiệu", kind: "textarea" },
      { key: "image", label: "Ảnh chân dung (link)", kind: "url" },
      { key: "stats", label: "Con số (mỗi dòng: số | nhãn)", kind: "lines", hint: "vd: 10+ năm | chạy quảng cáo thật" },
    ],
  },
  testimonials: {
    label: "Cảm nhận học viên",
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "items", label: "Cảm nhận (mỗi dòng: Tên | nội dung)", kind: "lines", hint: "Để trống = lấy cảm nhận của khóa trong Admin → Cảm nhận học viên" },
      { key: "images", label: "Ảnh chụp feedback (mỗi dòng 1 link ảnh)", kind: "lines" },
    ],
  },
  pricing: {
    label: "Bảng giá + quà tặng + đếm ngược",
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "bonuses", label: "Bạn nhận được (mỗi dòng 1 ý)", kind: "lines" },
      { key: "deadline", label: "Hạn ưu đãi (đếm ngược)", kind: "datetime", hint: "Để trống = không đếm ngược" },
      { key: "note", label: "Ghi chú dưới giá", kind: "textarea", hint: "vd: Hoàn tiền 100% trong 7 ngày nếu không hài lòng" },
      { key: "cta_text", label: "Chữ trên nút", kind: "text" },
    ],
  },
  faq: {
    label: "Câu hỏi thường gặp",
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "items", label: "Mỗi dòng: Câu hỏi | Trả lời", kind: "lines" },
    ],
  },
  text: {
    label: "Đoạn chữ tự do",
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "body", label: "Nội dung", kind: "textarea" },
    ],
  },
  cta: {
    label: "Kêu gọi hành động (nút lớn)",
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "subtitle", label: "Câu phụ", kind: "textarea" },
      { key: "cta_text", label: "Chữ trên nút", kind: "text" },
    ],
  },
  checkout: {
    label: "Form đăng ký mua",
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "subtitle", label: "Câu phụ", kind: "textarea" },
      { key: "button_text", label: "Chữ trên nút", kind: "text" },
    ],
  },
} satisfies Record<string, { label: string; fields: BlockField[] }>;

export type BlockType = keyof typeof BLOCK_DEFS;
export const BLOCKS: Record<BlockType, { label: string; fields: BlockField[] }> = BLOCK_DEFS;
export type BlockData = Record<string, string>;
export type Block = { id: string; type: BlockType; data: BlockData };

export const isBlockType = (t: string): t is BlockType => t in BLOCKS;

/** "a | b" -> [a, b] */
export const splitPair = (line: string) => {
  const i = line.indexOf("|");
  return i < 0 ? [line.trim(), ""] : [line.slice(0, i).trim(), line.slice(i + 1).trim()];
};
export const linesOf = (v?: string) => (v ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

export const newBlockId = () => Math.random().toString(36).slice(2, 10);

/** Chuẩn hóa dữ liệu đọc từ DB (bỏ khối lạ, ép kiểu chuỗi) */
export function parseSections(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b): b is { id?: unknown; type: string; data?: unknown } => !!b && typeof b === "object" && isBlockType(String((b as { type?: unknown }).type)))
    .map((b) => {
      const data: BlockData = {};
      if (b.data && typeof b.data === "object") for (const [k, v] of Object.entries(b.data)) data[k] = String(v ?? "");
      return { id: typeof b.id === "string" && b.id ? b.id : newBlockId(), type: b.type as BlockType, data };
    });
}

/** Bộ khối mẫu cho trang mới, điền sẵn từ thông tin khóa học */
export function starterBlocks(c: { title: string; subtitle?: string | null; description?: string | null; outcomes?: string[] | null }): Block[] {
  const mk = (type: BlockType, data: BlockData): Block => ({ id: newBlockId(), type, data });
  return [
    mk("hero", {
      badge: "KHÓA HỌC ONLINE · HỌC MỌI LÚC MỌI NƠI",
      headline: c.title,
      subheadline: c.subtitle || "",
      cta_text: "ĐĂNG KÝ NGAY",
    }),
    mk("pain", {
      title: "Bạn có đang gặp những vấn đề này?",
      items: [
        "Chạy quảng cáo đốt tiền mà không ra đơn",
        "Không biết bắt đầu từ đâu, học lan man trên mạng",
        "Tài khoản quảng cáo hay bị khóa, bị hạn chế",
        "Không đo được quảng cáo nào lãi, quảng cáo nào lỗ",
      ].join("\n"),
      closing: "Khóa học này được làm ra để giải quyết đúng những việc đó.",
    }),
    mk("benefits", { title: "Học xong bạn làm được gì?", items: (c.outcomes ?? []).join("\n") }),
    mk("curriculum", { title: "Nội dung khóa học", note: "" }),
    mk("instructor", {
      title: "Người hướng dẫn",
      name: "Lê Bá Tùng",
      bio: "Chuyên gia quảng cáo Facebook với 10 năm thực chiến, trực tiếp chạy quảng cáo cho hàng trăm sản phẩm. Những gì trong khóa là những gì đã làm thật, ra tiền thật.",
      stats: "10+ năm | chạy quảng cáo thực chiến\n1.000+ | học viên đã học",
    }),
    mk("testimonials", { title: "Học viên nói gì?", items: "" }),
    mk("pricing", {
      title: "Đăng ký hôm nay",
      bonuses: "Truy cập khóa học 12 tháng\nHọc trên điện thoại & máy tính\nNhóm hỗ trợ học viên",
      note: "Thanh toán bằng chuyển khoản quét mã QR — kích hoạt tự động ngay sau khi chuyển.",
      cta_text: "ĐĂNG KÝ NGAY",
    }),
    mk("faq", {
      title: "Câu hỏi thường gặp",
      items: [
        "Tôi chưa biết gì về quảng cáo có học được không? | Được. Khóa đi từ cơ bản, làm theo từng bước.",
        "Học trong bao lâu? | Bạn được truy cập 12 tháng, học lại bao nhiêu lần cũng được.",
        "Thanh toán xong bao lâu thì vào học? | Ngay lập tức — hệ thống tự kích hoạt và gửi email đăng nhập.",
      ].join("\n"),
    }),
    mk("checkout", {
      title: "Đăng ký khóa học",
      subtitle: "Điền thông tin, bước sau quét mã QR để thanh toán.",
      button_text: "TIẾP TỤC THANH TOÁN",
    }),
  ];
}

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
export type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;
