/** Định nghĩa 4 công cụ AI quảng cáo — dùng chung cho server (prompt) và client (form). Không import server-only ở đây. */

export type ToolKey = "viet-content" | "cham-diem-quang-cao" | "cham-diem-fanpage" | "tao-landing";

export type ToolField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  required?: boolean;
  options?: string[];
  rows?: number;
};

export type ToolDef = {
  key: ToolKey;
  title: string;
  short: string;
  output: "text" | "json";
  fields: ToolField[];
};

export const TOOLS: ToolDef[] = [
  {
    key: "viet-content",
    title: "Viết content quảng cáo",
    short: "Bài quảng cáo Facebook, kịch bản video ngắn, tiêu đề & hook — theo công thức chạy ra đơn.",
    output: "text",
    fields: [
      { name: "product", label: "Sản phẩm / dịch vụ", type: "textarea", rows: 3, required: true, placeholder: "VD: Áo khoác gió nữ chống nắng, vải thun lạnh, 3 màu, size S–XL" },
      { name: "audience", label: "Khách hàng mục tiêu", type: "text", placeholder: "VD: Nữ 22–35, dân văn phòng, đi xe máy" },
      { name: "pain", label: "Nỗi đau / mong muốn của khách", type: "textarea", rows: 2, placeholder: "VD: Nắng gắt, sợ đen da, áo chống nắng thường bí nóng" },
      { name: "offer", label: "Giá & ưu đãi", type: "text", placeholder: "VD: 199K, mua 2 giảm 50K, freeship, COD" },
      { name: "format", label: "Loại nội dung", type: "select", options: ["Bài quảng cáo Facebook (dài)", "Bài quảng cáo ngắn (dưới 80 chữ)", "Kịch bản video ngắn 30–45 giây", "10 tiêu đề + câu hook mở đầu"] },
      { name: "goal", label: "Mục tiêu chiến dịch", type: "select", options: ["Tin nhắn", "Chuyển đổi trên web", "Thu số điện thoại (lead)", "Tương tác"] },
      { name: "tone", label: "Giọng văn", type: "select", options: ["Thân thiện, gần gũi", "Chuyên gia, tin cậy", "Hài hước, bắt trend", "Sang trọng, cao cấp"] },
      { name: "variants", label: "Số phương án", type: "select", options: ["2", "1", "3"] },
    ],
  },
  {
    key: "cham-diem-quang-cao",
    title: "Chấm điểm bài quảng cáo",
    short: "Chấm 8 tiêu chí, chỉ ra lỗi làm tốn tiền, rủi ro vi phạm chính sách và viết lại bản tốt hơn.",
    output: "json",
    fields: [
      { name: "ad", label: "Nội dung bài quảng cáo", type: "textarea", rows: 8, required: true, placeholder: "Dán toàn bộ nội dung bài quảng cáo…" },
      { name: "industry", label: "Ngành hàng", type: "text", placeholder: "VD: Thời trang nữ, mỹ phẩm, khóa học…" },
      { name: "goal", label: "Mục tiêu", type: "select", options: ["Tin nhắn", "Chuyển đổi trên web", "Thu số điện thoại (lead)", "Tương tác"] },
      { name: "creative", label: "Mô tả hình ảnh/video đi kèm (tuỳ chọn)", type: "textarea", rows: 2, placeholder: "VD: Ảnh người mẫu mặc áo ngoài nắng, có chữ SALE 50%" },
    ],
  },
  {
    key: "cham-diem-fanpage",
    title: "Chấm điểm fanpage",
    short: "Đánh giá độ tin cậy & khả năng chốt đơn của fanpage, kèm việc cần sửa ngay và kế hoạch 7 ngày.",
    output: "json",
    fields: [
      { name: "name", label: "Tên fanpage", type: "text", required: true },
      { name: "industry", label: "Lĩnh vực kinh doanh", type: "text", required: true, placeholder: "VD: Shop mỹ phẩm handmade" },
      { name: "visuals", label: "Ảnh đại diện & ảnh bìa (mô tả)", type: "textarea", rows: 2, placeholder: "VD: Ảnh đại diện là logo chữ, ảnh bìa là sản phẩm + số hotline" },
      { name: "about", label: "Phần giới thiệu, địa chỉ, hotline, website", type: "textarea", rows: 3 },
      { name: "stats", label: "Lượt theo dõi, đánh giá sao, số review", type: "text", placeholder: "VD: 3.200 theo dõi, 4.8 sao, 25 đánh giá" },
      { name: "activity", label: "Tần suất đăng & tương tác trung bình", type: "text", placeholder: "VD: 3 bài/tuần, mỗi bài 20–50 like, ít bình luận" },
      { name: "cta", label: "Nút hành động, tin nhắn tự động, thời gian phản hồi", type: "text", placeholder: "VD: Nút Gửi tin nhắn, có chào tự động, trả lời trong 1 giờ" },
      { name: "posts", label: "Dán 2–3 bài đăng gần nhất", type: "textarea", rows: 6 },
    ],
  },
  {
    key: "tao-landing",
    title: "Tạo landing page bán hàng",
    short: "Sinh trọn bộ nội dung landing chuẩn chuyển đổi, xem trước và tải file HTML dùng ngay.",
    output: "json",
    fields: [
      { name: "product", label: "Sản phẩm / dịch vụ", type: "textarea", rows: 3, required: true },
      { name: "price", label: "Giá bán & ưu đãi", type: "text", required: true, placeholder: "VD: 399K → 299K, tặng kèm…, hết hạn 31/12" },
      { name: "audience", label: "Khách hàng mục tiêu & nỗi đau", type: "textarea", rows: 2 },
      { name: "proof", label: "Bằng chứng (số đã bán, chứng nhận, cảm nhận thật)", type: "textarea", rows: 2 },
      { name: "contact", label: "Hotline / Zalo / link đặt hàng", type: "text", required: true },
      { name: "color", label: "Màu chủ đạo", type: "select", options: ["Xanh dương", "Đỏ cam", "Xanh lá", "Tím", "Đen vàng sang trọng", "Hồng pastel"] },
    ],
  },
];

export const toolByKey = (k: string) => TOOLS.find((t) => t.key === k);

/** Kết quả chấm điểm (bài quảng cáo / fanpage) */
export type ScoreResult = {
  total: number;
  verdict: string;
  criteria: { name: string; score: number; comment: string }[];
  strengths: string[];
  issues: string[];
  policy_risks?: string[];
  quick_wins?: string[];
  plan_7_days?: string[];
  rewrite?: string;
};

/** Nội dung landing page */
export type LandingResult = {
  seo_title: string;
  seo_description: string;
  headline: string;
  subheadline: string;
  cta: string;
  pain_points: string[];
  benefits: { title: string; desc: string }[];
  how_it_works: { title: string; desc: string }[];
  offer: { title: string; price: string; old_price: string; bonuses: string[]; urgency: string };
  testimonials: { name: string; text: string }[];
  faq: { q: string; a: string }[];
  guarantee: string;
  final_cta: string;
};
