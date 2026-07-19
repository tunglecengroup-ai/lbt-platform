/**
 * Dữ liệu mẫu cho prototype.
 * Toàn bộ số liệu là GIẢ LẬP — khi nối Supabase thật thì thay module này
 * bằng các hàm query tương ứng, giữ nguyên kiểu dữ liệu bên dưới.
 */

export type LeadStage = "moi" | "da-lien-he" | "quan-tam" | "dam-phan" | "chot" | "mat";

export const LEAD_STAGES: { id: LeadStage; label: string; tone: Tone }[] = [
  { id: "moi", label: "Lead mới", tone: "info" },
  { id: "da-lien-he", label: "Đã liên hệ", tone: "violet" },
  { id: "quan-tam", label: "Quan tâm", tone: "warning" },
  { id: "dam-phan", label: "Đàm phán", tone: "warning" },
  { id: "chot", label: "Chốt đơn", tone: "success" },
  { id: "mat", label: "Mất", tone: "danger" },
];

export type Tone = "info" | "success" | "warning" | "danger" | "violet" | "neutral";

export type LeadSource = "Facebook Ads" | "Landing page" | "YouTube" | "Giới thiệu" | "Inbox page";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: LeadSource;
  campaign: string;
  interest: string;
  value: number;
  stage: LeadStage;
  owner: string;
  score: number;
  lastTouch: string;
  note: string;
};

export const leads: Lead[] = [
  { id: "L-2418", name: "Nguyễn Minh Quân", phone: "0938 224 118", email: "quan.nm@gmail.com", source: "Facebook Ads", campaign: "A1 - Khóa 199K", interest: "FB Ads cầm tay", value: 199_000, stage: "moi", owner: "Thu Hà", score: 72, lastTouch: "2026-07-20T04:20:00Z", note: "Điền form từ landing 199K, chưa gọi." },
  { id: "L-2417", name: "Trần Thị Bích Ngọc", phone: "0912 776 402", email: "ngoctb@gmail.com", source: "Landing page", campaign: "LP - Combo Ads Pro", interest: "Combo Ads Pro", value: 4_990_000, stage: "dam-phan", owner: "Thu Hà", score: 91, lastTouch: "2026-07-20T02:10:00Z", note: "Đang so sánh với khóa của bên khác, cần case study." },
  { id: "L-2416", name: "Lê Hoàng Nam", phone: "0987 331 550", email: "namlh.dev@gmail.com", source: "YouTube", campaign: "Video: Scale ads 100tr", interest: "Coaching 1-1", value: 15_000_000, stage: "quan-tam", owner: "Anh Tùng", score: 88, lastTouch: "2026-07-19T09:40:00Z", note: "Chủ shop thời trang, ngân sách ads 80tr/tháng." },
  { id: "L-2415", name: "Phạm Quốc Đạt", phone: "0903 118 264", email: "datpq@outlook.com", source: "Facebook Ads", campaign: "A2 - Khóa 199K", interest: "FB Ads cầm tay", value: 199_000, stage: "da-lien-he", owner: "Minh Trí", score: 55, lastTouch: "2026-07-19T07:15:00Z", note: "Bắt máy, hẹn gọi lại cuối tuần." },
  { id: "L-2414", name: "Vũ Thanh Trúc", phone: "0977 645 209", email: "truc.vu@gmail.com", source: "Inbox page", campaign: "Organic - Fanpage LBT", interest: "FB Ads cầm tay", value: 199_000, stage: "chot", owner: "Thu Hà", score: 95, lastTouch: "2026-07-19T03:05:00Z", note: "Đã chuyển khoản, chờ cấp tài khoản học." },
  { id: "L-2413", name: "Đỗ Hữu Phước", phone: "0967 512 883", email: "phuocdh@gmail.com", source: "Facebook Ads", campaign: "A1 - Khóa 199K", interest: "FB Ads cầm tay", value: 199_000, stage: "mat", owner: "Minh Trí", score: 21, lastTouch: "2026-07-18T11:30:00Z", note: "Không nghe máy 5 lần, số ảo." },
  { id: "L-2412", name: "Hoàng Thị Mai Anh", phone: "0946 200 771", email: "maianh.hoang@gmail.com", source: "Giới thiệu", campaign: "Học viên cũ giới thiệu", interest: "Combo Ads Pro", value: 4_990_000, stage: "dam-phan", owner: "Anh Tùng", score: 86, lastTouch: "2026-07-18T08:00:00Z", note: "Bạn của học viên K12, xin ưu đãi 15%." },
  { id: "L-2411", name: "Bùi Văn Sơn", phone: "0921 448 337", email: "sonbv.ads@gmail.com", source: "Landing page", campaign: "LP - Webinar tháng 7", interest: "Webinar Scale", value: 0, stage: "moi", owner: "Chưa gán", score: 40, lastTouch: "2026-07-20T01:00:00Z", note: "Đăng ký webinar, chưa xem." },
  { id: "L-2410", name: "Ngô Kim Chi", phone: "0908 995 116", email: "chingo.beauty@gmail.com", source: "Facebook Ads", campaign: "A3 - Retarget xem 75%", interest: "Coaching 1-1", value: 15_000_000, stage: "quan-tam", owner: "Anh Tùng", score: 79, lastTouch: "2026-07-17T10:20:00Z", note: "Ngành mỹ phẩm, đang chạy 30tr/tháng ROAS 1.8." },
  { id: "L-2409", name: "Trịnh Đức Hải", phone: "0933 707 458", email: "hai.trinh89@gmail.com", source: "YouTube", campaign: "Video: 5 lỗi target", interest: "FB Ads cầm tay", value: 199_000, stage: "da-lien-he", owner: "Minh Trí", score: 61, lastTouch: "2026-07-17T06:45:00Z", note: "Quan tâm nhưng đợi lương." },
  { id: "L-2408", name: "Lý Thu Phương", phone: "0918 336 924", email: "phuongly.shop@gmail.com", source: "Inbox page", campaign: "Organic - Fanpage LBT", interest: "Combo Ads Pro", value: 4_990_000, stage: "chot", owner: "Thu Hà", score: 93, lastTouch: "2026-07-16T04:30:00Z", note: "Đã thanh toán full." },
  { id: "L-2407", name: "Cao Anh Tuấn", phone: "0949 812 663", email: "tuancao.mkt@gmail.com", source: "Facebook Ads", campaign: "A2 - Khóa 199K", interest: "FB Ads cầm tay", value: 199_000, stage: "quan-tam", owner: "Minh Trí", score: 68, lastTouch: "2026-07-16T02:00:00Z", note: "Hỏi kỹ về nội dung buổi 5-6." },
];

export type Student = {
  id: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  enrolledAt: string;
  progress: number;
  lessonsDone: number;
  lessonsTotal: number;
  lastActive: string;
  status: "dang-hoc" | "hoan-thanh" | "nguy-co" | "bo-hoc";
};

export const students: Student[] = [
  { id: "HV-1042", name: "Vũ Thanh Trúc", email: "truc.vu@gmail.com", phone: "0977 645 209", course: "FB Ads cầm tay", enrolledAt: "2026-07-19", progress: 8, lessonsDone: 4, lessonsTotal: 56, lastActive: "2026-07-20T05:00:00Z", status: "dang-hoc" },
  { id: "HV-1041", name: "Lý Thu Phương", email: "phuongly.shop@gmail.com", phone: "0918 336 924", course: "Combo Ads Pro", enrolledAt: "2026-07-16", progress: 21, lessonsDone: 17, lessonsTotal: 82, lastActive: "2026-07-20T03:30:00Z", status: "dang-hoc" },
  { id: "HV-1038", name: "Nguyễn Hải Đăng", email: "dangnh.store@gmail.com", phone: "0905 224 887", course: "FB Ads cầm tay", enrolledAt: "2026-06-28", progress: 96, lessonsDone: 54, lessonsTotal: 56, lastActive: "2026-07-19T14:10:00Z", status: "dang-hoc" },
  { id: "HV-1035", name: "Phan Mỹ Duyên", email: "duyen.pm@gmail.com", phone: "0932 445 118", course: "FB Ads cầm tay", enrolledAt: "2026-06-20", progress: 100, lessonsDone: 56, lessonsTotal: 56, lastActive: "2026-07-14T08:00:00Z", status: "hoan-thanh" },
  { id: "HV-1031", name: "Trương Bảo Long", email: "longtb.ads@gmail.com", phone: "0961 773 220", course: "Combo Ads Pro", enrolledAt: "2026-06-11", progress: 43, lessonsDone: 35, lessonsTotal: 82, lastActive: "2026-07-05T09:00:00Z", status: "nguy-co" },
  { id: "HV-1027", name: "Đặng Thuỳ Linh", email: "linhdt.mkt@gmail.com", phone: "0914 668 302", course: "FB Ads cầm tay", enrolledAt: "2026-05-30", progress: 62, lessonsDone: 35, lessonsTotal: 56, lastActive: "2026-07-18T12:20:00Z", status: "dang-hoc" },
  { id: "HV-1024", name: "Hồ Trung Kiên", email: "kienht@gmail.com", phone: "0982 117 546", course: "Coaching 1-1", enrolledAt: "2026-05-22", progress: 75, lessonsDone: 9, lessonsTotal: 12, lastActive: "2026-07-17T02:45:00Z", status: "dang-hoc" },
  { id: "HV-1019", name: "Nguyễn Thị Hạnh", email: "hanhnt.shop@gmail.com", phone: "0939 550 118", course: "FB Ads cầm tay", enrolledAt: "2026-05-08", progress: 14, lessonsDone: 8, lessonsTotal: 56, lastActive: "2026-06-12T07:00:00Z", status: "bo-hoc" },
  { id: "HV-1015", name: "Lâm Chí Cường", email: "cuonglc.ads@gmail.com", phone: "0908 442 771", course: "Combo Ads Pro", enrolledAt: "2026-04-29", progress: 88, lessonsDone: 72, lessonsTotal: 82, lastActive: "2026-07-19T16:00:00Z", status: "dang-hoc" },
  { id: "HV-1009", name: "Tạ Ngọc Ánh", email: "anhtn.beauty@gmail.com", phone: "0977 203 664", course: "FB Ads cầm tay", enrolledAt: "2026-04-14", progress: 100, lessonsDone: 56, lessonsTotal: 56, lastActive: "2026-07-02T10:30:00Z", status: "hoan-thanh" },
  { id: "HV-1004", name: "Võ Thành Đạt", email: "datvt.mkt@gmail.com", phone: "0966 118 405", course: "Coaching 1-1", enrolledAt: "2026-03-30", progress: 33, lessonsDone: 4, lessonsTotal: 12, lastActive: "2026-06-28T05:15:00Z", status: "nguy-co" },
  { id: "HV-0998", name: "Kiều Anh Thư", email: "thuka.store@gmail.com", phone: "0923 887 116", course: "FB Ads cầm tay", enrolledAt: "2026-03-18", progress: 100, lessonsDone: 56, lessonsTotal: 56, lastActive: "2026-05-20T09:00:00Z", status: "hoan-thanh" },
];

export type Course = {
  id: string;
  title: string;
  price: number;
  lessons: number;
  hours: number;
  students: number;
  completionRate: number;
  rating: number;
  status: "dang-ban" | "sap-mo" | "dong";
  cover: string; // gradient class
};

export const courses: Course[] = [
  { id: "C-01", title: "FB Ads cầm tay chỉ việc", price: 199_000, lessons: 56, hours: 14, students: 842, completionRate: 61, rating: 4.8, status: "dang-ban", cover: "from-blue-500 to-indigo-600" },
  { id: "C-02", title: "Combo Ads Pro — Scale 100tr/tháng", price: 4_990_000, lessons: 82, hours: 26, students: 137, completionRate: 48, rating: 4.9, status: "dang-ban", cover: "from-violet-500 to-fuchsia-600" },
  { id: "C-03", title: "Coaching 1-1 cùng Lê Bá Tùng", price: 15_000_000, lessons: 12, hours: 18, students: 24, completionRate: 72, rating: 5.0, status: "dang-ban", cover: "from-amber-500 to-orange-600" },
  { id: "C-04", title: "Content bán hàng bằng AI", price: 1_490_000, lessons: 34, hours: 9, students: 0, completionRate: 0, rating: 0, status: "sap-mo", cover: "from-emerald-500 to-teal-600" },
];

export type Order = {
  id: string;
  student: string;
  course: string;
  amount: number;
  method: "Chuyển khoản" | "VNPAY" | "Momo" | "Thẻ quốc tế";
  status: "da-thanh-toan" | "cho-xac-nhan" | "hoan-tien";
  createdAt: string;
};

export const orders: Order[] = [
  { id: "DH-5521", student: "Vũ Thanh Trúc", course: "FB Ads cầm tay", amount: 199_000, method: "Chuyển khoản", status: "da-thanh-toan", createdAt: "2026-07-19T03:05:00Z" },
  { id: "DH-5520", student: "Lý Thu Phương", course: "Combo Ads Pro", amount: 4_990_000, method: "VNPAY", status: "da-thanh-toan", createdAt: "2026-07-16T04:30:00Z" },
  { id: "DH-5519", student: "Nguyễn Hải Đăng", course: "FB Ads cầm tay", amount: 199_000, method: "Momo", status: "da-thanh-toan", createdAt: "2026-07-15T08:12:00Z" },
  { id: "DH-5518", student: "Trần Thị Bích Ngọc", course: "Combo Ads Pro", amount: 4_990_000, method: "Chuyển khoản", status: "cho-xac-nhan", createdAt: "2026-07-20T01:40:00Z" },
  { id: "DH-5517", student: "Hồ Trung Kiên", course: "Coaching 1-1", amount: 15_000_000, method: "Chuyển khoản", status: "da-thanh-toan", createdAt: "2026-07-12T06:00:00Z" },
  { id: "DH-5516", student: "Đặng Thuỳ Linh", course: "FB Ads cầm tay", amount: 199_000, method: "VNPAY", status: "da-thanh-toan", createdAt: "2026-07-10T11:25:00Z" },
  { id: "DH-5515", student: "Nguyễn Thị Hạnh", course: "FB Ads cầm tay", amount: 199_000, method: "Momo", status: "hoan-tien", createdAt: "2026-07-08T09:00:00Z" },
  { id: "DH-5514", student: "Lâm Chí Cường", course: "Combo Ads Pro", amount: 4_990_000, method: "Thẻ quốc tế", status: "da-thanh-toan", createdAt: "2026-07-05T14:50:00Z" },
];

/** Doanh thu 12 tháng gần nhất (triệu đồng đã quy ra VND) */
export const revenueByMonth = [
  { month: "T8/25", doanhThu: 84_000_000, hocVienMoi: 61 },
  { month: "T9/25", doanhThu: 96_500_000, hocVienMoi: 74 },
  { month: "T10/25", doanhThu: 112_000_000, hocVienMoi: 88 },
  { month: "T11/25", doanhThu: 141_000_000, hocVienMoi: 103 },
  { month: "T12/25", doanhThu: 186_000_000, hocVienMoi: 142 },
  { month: "T1/26", doanhThu: 128_000_000, hocVienMoi: 79 },
  { month: "T2/26", doanhThu: 97_000_000, hocVienMoi: 58 },
  { month: "T3/26", doanhThu: 154_000_000, hocVienMoi: 111 },
  { month: "T4/26", doanhThu: 178_000_000, hocVienMoi: 126 },
  { month: "T5/26", doanhThu: 165_000_000, hocVienMoi: 118 },
  { month: "T6/26", doanhThu: 203_000_000, hocVienMoi: 147 },
  { month: "T7/26", doanhThu: 231_500_000, hocVienMoi: 168 },
];

export const leadsBySource = [
  { source: "Facebook Ads", value: 412, color: "hsl(var(--primary))" },
  { source: "Landing page", value: 236, color: "hsl(var(--violet))" },
  { source: "YouTube", value: 158, color: "hsl(var(--success))" },
  { source: "Inbox page", value: 121, color: "hsl(var(--warning))" },
  { source: "Giới thiệu", value: 64, color: "hsl(var(--muted-foreground))" },
];

export type Automation = {
  id: string;
  name: string;
  channel: "Email" | "Telegram" | "Email + Telegram";
  trigger: string;
  steps: number;
  audience: number;
  sent: number;
  openRate: number;
  active: boolean;
};

export const automations: Automation[] = [
  { id: "AU-01", name: "Chào mừng học viên mới", channel: "Email", trigger: "Ngay khi thanh toán thành công", steps: 4, audience: 842, sent: 3218, openRate: 68, active: true },
  { id: "AU-02", name: "Nhắc học — không vào 3 ngày", channel: "Email + Telegram", trigger: "Không hoạt động 72 giờ", steps: 3, audience: 214, sent: 1104, openRate: 52, active: true },
  { id: "AU-03", name: "Cứu học viên nguy cơ bỏ", channel: "Telegram", trigger: "Tiến độ < 20% sau 14 ngày", steps: 5, audience: 47, sent: 233, openRate: 74, active: true },
  { id: "AU-04", name: "Nuôi lead nguội 30 ngày", channel: "Email", trigger: "Lead ở trạng thái Quan tâm > 7 ngày", steps: 7, audience: 386, sent: 2702, openRate: 41, active: true },
  { id: "AU-05", name: "Upsell Combo sau khi xong khóa 199K", channel: "Email", trigger: "Hoàn thành 100% khóa FB Ads cầm tay", steps: 5, audience: 168, sent: 840, openRate: 59, active: true },
  { id: "AU-06", name: "Chúc mừng hoàn thành + xin review", channel: "Email + Telegram", trigger: "Hoàn thành khóa học", steps: 2, audience: 168, sent: 336, openRate: 77, active: false },
  { id: "AU-07", name: "Cảnh báo đơn chờ xác nhận > 6h", channel: "Telegram", trigger: "Đơn ở trạng thái chờ xác nhận", steps: 1, audience: 0, sent: 96, openRate: 100, active: true },
];

export type ActivityItem = {
  id: string;
  type: "lead" | "order" | "progress" | "automation";
  text: string;
  at: string;
};

export const activity: ActivityItem[] = [
  { id: "A1", type: "order", text: "Trần Thị Bích Ngọc tạo đơn Combo Ads Pro — chờ xác nhận chuyển khoản", at: "2026-07-20T01:40:00Z" },
  { id: "A2", type: "lead", text: "12 lead mới từ campaign A1 - Khóa 199K", at: "2026-07-20T04:20:00Z" },
  { id: "A3", type: "progress", text: "Nguyễn Hải Đăng hoàn thành buổi 7 — còn 2 bài là xong khóa", at: "2026-07-19T14:10:00Z" },
  { id: "A4", type: "automation", text: 'Automation "Cứu học viên nguy cơ bỏ" gửi 18 tin Telegram', at: "2026-07-19T09:00:00Z" },
  { id: "A5", type: "order", text: "Vũ Thanh Trúc thanh toán thành công khóa FB Ads cầm tay", at: "2026-07-19T03:05:00Z" },
  { id: "A6", type: "lead", text: "Lê Hoàng Nam chuyển sang trạng thái Quan tâm (Coaching 1-1)", at: "2026-07-19T09:40:00Z" },
];
