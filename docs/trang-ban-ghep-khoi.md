# Trang bán ghép khối (11/11/2026)

Admin → **Trang bán (Landing)** → tạo trang → hoc.lebatung.com/l/<đường-dẫn>

## Thứ tự triển khai (BẮT BUỘC)
1. Chạy `supabase/migrations/20261111_landing_pages.sql` trên Supabase prod **trước**
   (code mới ghi cột `orders.landing_id` + `utm_*` mỗi khi tạo đơn — thiếu cột là mọi đơn đều lỗi).
2. Sau đó mới push code lên Netlify.

## Có gì
- 12 loại khối: đầu trang (video YouTube/ảnh), nỗi đau, lợi ích, video, nội dung khóa (tự lấy mục lục),
  giảng viên, cảm nhận (tự lấy từ Admin → Cảm nhận nếu để trống), bảng giá + quà + đếm ngược, hỏi đáp,
  đoạn chữ, kêu gọi, form đăng ký. Thêm / sửa / lên-xuống / nhân bản / xóa khối.
- Giá riêng cho từng trang (để trống = giá khóa), giá gạch, màu chủ đạo, ảnh/tiêu đề chia sẻ.
- Nháp → chỉ admin xem trước được; bấm Xuất bản mới mở cho khách. Trang không cho Google index.
- Nhân bản trang để test A/B.
- AI viết nội dung (cần ANTHROPIC_API_KEY trên Netlify).

## Đo lường
- `landing_events`: lượt xem (1/phiên) + "bắt đầu điền form", kèm UTM + mã người xem.
- Đơn tạo từ trang lưu `landing_id` + `utm_source/medium/campaign/content/term`.
- Pixel ViewContent / InitiateCheckout / Purchase + GA4 view_item / begin_checkout / purchase bắn như cũ.
- Admin: bảng phễu theo trang, theo chiến dịch (utm_campaign), mẫu quảng cáo (utm_content), nguồn.
- Link quảng cáo FB: `/l/<slug>?utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}`
