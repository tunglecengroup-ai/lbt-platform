# Đợt 09/11/2026 — Member · API · Automation · SEO · Công cụ AI

## Cần làm khi đẩy lên (theo thứ tự)

1. **Chạy SQL** `supabase/migrations/20261109_member_api_automation_ai.sql` trong Supabase → SQL Editor (chạy lại nhiều lần không sao).
   Tạo bảng: gói thành viên, thành viên, API key + nhật ký, kịch bản automation (8 kịch bản mẫu, đang TẮT), hủy nhận email, lượt dùng AI.
2. **Biến môi trường trên Netlify** (Project configuration → Environment variables):

| Biến | Bắt buộc | Dùng cho |
|---|---|---|
| `RESEND_API_KEY` | Có (automation) | Gửi email chăm sóc. Tạo ở resend.com → API Keys. Gói free 100 email/ngày |
| `CRON_SECRET` | Có (automation) | Chuỗi ngẫu nhiên dài bất kỳ — bảo vệ lịch chạy 15 phút |
| `ANTHROPIC_API_KEY` | Có (công cụ AI) | console.anthropic.com → API Keys (trả phí theo lượt dùng) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Tuỳ chọn | Bước "Báo Telegram cho anh" trong kịch bản |
| `EMAIL_FROM` | Tuỳ chọn | Mặc định `Học viện Lê Bá Tùng <hoc@lebatung.com>` |
| `AI_STUDENT_DAILY_QUOTA` | Tuỳ chọn | Lượt AI/ngày cho học viên thường (mặc định 10; Member theo gói) |
| `AI_MODEL` | Tuỳ chọn | Mặc định `claude-opus-5-5` |
| `NEXT_PUBLIC_GA4_ID` | Nên có | Mã đo lường GA4 dạng `G-XXXXXXX` (Google Analytics → Quản trị → Luồng dữ liệu) |
| `NEXT_PUBLIC_META_PIXEL_ID` | Nên có | ID Pixel (Events Manager), chỉ là dãy số |
| `META_CAPI_TOKEN` | Nên có | Mã truy cập Conversions API (Events Manager → Cài đặt) — ghi đơn từ máy chủ, không sót iOS |
| `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL` | Tuỳ chọn | Chuyển đổi Google Ads (vd `AW-18514096436` + nhãn chuyển đổi mua hàng) |
| `META_TEST_EVENT_CODE` | Tuỳ chọn | Chỉ khi test trong Events Manager, xong thì xóa |

3. **Sau khi lên**: Admin → Thành viên Member: duyệt giá 2 gói mẫu rồi tick "Hiển thị & mở bán". Admin → Automation: đọc nội dung từng kịch bản, gửi thử, rồi bật.

## Những gì đã có
- **Học viên**: bộ lọc (khóa, trạng thái, tiến độ, Member, khoảng ngày), xuất CSV, phân trang; xóa hẳn 1 quyền học; xóa học viên khỏi hệ thống; xem đơn hàng + gói thành viên trong trang chi tiết.
- **Thành viên Member** (`lebatung.com/thanh-vien`): gói học tất cả khóa + công cụ AI, thanh toán QR/SePay như khóa lẻ, gia hạn nối tiếp (tối đa 12 tháng), khóa mới tự mở cho thành viên.
- **API** (`hoc.lebatung.com/api/v1`): tạo tài khoản + mở khóa/gói, tra cứu, thu hồi; chống cấp trùng bằng `external_id`; tài liệu + tạo khóa ở Admin → API kết nối.
- **Automation**: 8 kịch bản theo sự kiện & thời gian, tự dừng khi đạt mục tiêu, giờ yên lặng 21h–8h, tối đa 1 email chăm sóc/20 giờ, hủy nhận 1 chạm (chuẩn Gmail/Yahoo), đo mở/bấm.
- **SEO/AEO/E-E-A-T**: schema Organization, Person, WebSite, Course, VideoObject, FAQPage, BlogPosting, Breadcrumb, ProfilePage; hộp tác giả; robots theo tên miền (cho bot AI đọc trang công khai, chặn khu học); `llms.txt`; logo/favicon.
- **Công cụ AI** (`hoc.lebatung.com/hoc/cong-cu`): viết content, chấm điểm bài quảng cáo, chấm điểm fanpage, tạo landing page (xem trước + tải HTML). Dành cho học viên còn hạn (10 lượt/ngày) và Member (theo gói).
- **Chứng nhận hoàn thành**: học xong 100% bài → nút "Nhận chứng nhận" (A4 ngang, in/lưu PDF, khoe Facebook); mỗi chứng nhận có mã xác minh công khai `lebatung.com/chung-nhan/<mã>`; email "Chúc mừng hoàn thành khóa" kèm link chứng nhận; admin thấy mã trong trang học viên.
- **GA4 + Meta Pixel + Google Ads**: hỏi đồng ý cookie (Consent Mode v2); sự kiện page_view, view_item/ViewContent, begin_checkout/InitiateCheckout, sign_up/CompleteRegistration, purchase/Purchase (mỗi đơn chỉ tính 1 lần); Meta Conversions API gửi Purchase từ máy chủ khi SePay xác nhận (trùng event_id với Pixel để loại trùng); đo xuyên 2 tên miền; không chạy trong admin.
