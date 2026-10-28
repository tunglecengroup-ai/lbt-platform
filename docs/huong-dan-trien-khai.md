# Hướng dẫn đưa web học lên mạng — bản MIỄN PHÍ (thay Edubit)

| Phần | Dịch vụ | Chi phí |
|---|---|---|
| Chạy web | **Netlify** gói Free | 0đ |
| Database + đăng nhập | **Supabase** gói Free | 0đ |
| Video bài giảng | **YouTube** chế độ "Không công khai" | 0đ |
| Gửi mã đăng nhập qua email | **Resend** gói Free (3.000 email/tháng) | 0đ |
| Tự mở khóa khi tiền về | **SePay** gói Free — hết lượt thì admin bấm xác nhận tay | 0đ |
| Tên miền | đã có | — |

Thời gian làm lần đầu: khoảng 60–90 phút. Làm đúng thứ tự dưới đây.

---

## Bước 1 — Supabase (database + đăng nhập)

1. Vào https://supabase.com → **New project** → Region **Singapore** → đặt mật khẩu DB (lưu lại).
2. **SQL Editor → New query** → dán toàn bộ `supabase/schema.sql` → **Run**.
3. (Tùy chọn) chạy `supabase/seed.sql` nếu muốn có 2 khóa mẫu để xem thử.
4. **Authentication → URL Configuration**
   - Site URL: `https://<tên-miền-của-anh>`
   - Redirect URLs: thêm `https://<tên-miền-của-anh>/**`
5. **Authentication → Emails → Magic Link**
   - Subject: `Mã đăng nhập Học viện Lê Bá Tùng: {{ .Token }}`
   - Body: dán nội dung file `supabase/templates/magic-link.html`
6. **Project Settings → API**: copy `Project URL`, `anon key`, `service_role key` (dùng ở Bước 4).

> Gói Free tự **tạm dừng** project nếu 7 ngày liền không ai truy cập. Có học viên vào hằng ngày thì không sao.
> Nếu bị dừng: vào supabase.com bấm **Restore** là chạy lại, không mất dữ liệu.

## Bước 2 — Resend (gửi mã đăng nhập)

Email mặc định của Supabase chỉ gửi được vài thư mỗi giờ → **bắt buộc** gắn Resend.

1. Đăng ký https://resend.com → **Domains → Add domain** → nhập tên miền → thêm các bản ghi DNS Resend đưa ra vào nơi quản lý tên miền (Tenten…) → chờ "Verified".
2. **API Keys → Create** → copy key.
3. Quay lại Supabase → **Authentication → Emails → SMTP Settings** → bật Custom SMTP:
   - Host `smtp.resend.com` · Port `465` · Username `resend` · Password = API key Resend
   - Sender email `hoc@<tên-miền>` · Sender name `Học viện Lê Bá Tùng`

## Bước 3 — Video trên YouTube

1. Upload video bài giảng lên YouTube → mục **Chế độ hiển thị** chọn **Không công khai** (Unlisted).
   Không chọn "Riêng tư" — riêng tư thì web không phát được.
2. Trong **Admin → Khóa học → bài học** dán link video vào ô **Link YouTube** (dán cả link `https://youtu.be/...` cũng được).

Bảo vệ đã có: người ngoài không xem được link video trên web vì chỉ học viên đã mua mới được web trả về video.
Giới hạn: học viên đã mua vẫn có thể bấm "Xem trên YouTube" để copy link gửi người khác.
Khi muốn chặn triệt để → chuyển sang Bunny Stream (~25.000đ/tháng), web đã hỗ trợ sẵn, chỉ cần thêm 2 biến `BUNNY_LIBRARY_ID`, `BUNNY_TOKEN_KEY`.

## Bước 4 — SePay (tự động mở khóa khi tiền về)

1. Đăng ký https://my.sepay.vn → chọn **gói Free** → liên kết tài khoản ngân hàng nhận tiền.
   Kiểm tra trong trang gói cước xem gói Free được bao nhiêu giao dịch/tháng.
2. **Tích hợp Webhooks → Thêm webhook**
   - Sự kiện: **Có tiền vào**
   - URL: `https://<tên-miền>/api/webhooks/sepay`
   - Kiểu chứng thực: **API Key** → tự đặt 1 chuỗi bí mật dài (vd 40 ký tự ngẫu nhiên) → dùng làm `SEPAY_WEBHOOK_KEY` ở Bước 5.

Khách chuyển khoản đúng nội dung `LBTxxxxxx` → vài giây sau khóa tự mở, trang thanh toán tự chuyển "Thành công".

**Khi hết lượt miễn phí của SePay, hoặc khách chuyển sai nội dung:** khóa chưa tự mở.
Anh vào **Admin → Đơn hàng**, đối chiếu với app ngân hàng → bấm **Xác nhận** → khóa mở ngay, khách tải lại trang là vào học được.

## Bước 5 — Netlify (chạy web)

1. Đẩy code lên GitHub (repo `lbt-platform`, nên để **Private**).
2. Đăng ký https://netlify.com bằng tài khoản GitHub → **Add new site → Import an existing project** → chọn repo `lbt-platform`.
   Netlify tự nhận Next.js (đã có sẵn file `netlify.toml`) → chưa bấm Deploy vội.
3. **Site configuration → Environment variables** → thêm:

| Biến | Giá trị |
|---|---|
| `APP_PASSWORD` | mật khẩu vào /admin |
| `APP_SESSION_SECRET` | chuỗi ngẫu nhiên dài (khác mật khẩu) |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (Bước 1) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key — **BÍ MẬT** |
| `BANK_ID` | mã ngân hàng VietQR: `MB`, `VCB`, `TCB`, `ACB`, `BIDV`, `VPB`… |
| `BANK_ACCOUNT_NO` | số tài khoản nhận tiền |
| `BANK_ACCOUNT_NAME` | tên chủ tài khoản, IN HOA không dấu |
| `SEPAY_WEBHOOK_KEY` | chuỗi bí mật đặt ở Bước 4 |
| `GETRESPONSE_API_KEY` | (tùy chọn) mua xong tự vào list GetResponse |
| `GETRESPONSE_DEFAULT_CAMPAIGN_ID` | (tùy chọn) list mặc định |

4. **Deploys → Trigger deploy**. Xong sẽ có link dạng `ten-site.netlify.app` để xem thử.

> Gói Free của Netlify tính theo hạn mức hằng tháng; nếu dùng hết, web tạm dừng tới đầu tháng sau.
> Với trang khóa học (video nằm ở YouTube, không tốn băng thông Netlify) thì rất khó chạm hạn mức.
> Xem mức đã dùng ở **Team → Usage**.

## Bước 6 — Gắn tên miền

1. Netlify → **Domain management → Add a domain** → nhập tên miền (vd `hoc.lebatung.com`).
2. Vào nơi mua tên miền thêm bản ghi đúng như Netlify chỉ dẫn:
   - Tên miền con (`hoc`): bản ghi **CNAME** → `<ten-site>.netlify.app`
   - Tên miền chính: bản ghi **A** theo IP Netlify hiển thị
3. Chờ 5–30 phút, Netlify tự cấp HTTPS.
4. Quay lại Supabase (Bước 1.4) và SePay (Bước 4.2) kiểm tra đã dùng đúng tên miền thật.

> Project cũ `lbt-platform-app` trên Vercel không dùng nữa — gỡ tên miền `app.lebatung.com` khỏi Vercel nếu muốn dùng lại cho Netlify.

## Bước 7 — Chuyển học viên & khóa từ Edubit

1. **Admin → Khóa học → Tạo khóa học** → điền thông tin trang bán, thêm chương/bài, dán link YouTube.
2. Trên Edubit: xuất danh sách học viên từng khóa ra Excel (email, họ tên, SĐT).
3. **Admin → Học viên → Cấp quyền / Nhập từ Edubit** → chọn khóa → copy 3 cột từ Excel dán vào → **Cấp quyền học**.
4. Mua thử 1 đơn thật (tạm đặt giá khóa 2.000đ) để chắc chắn SePay tự mở khóa.
5. Báo học viên cũ: "Từ nay vào học tại `https://<tên-miền>/hoc`, đăng nhập bằng email cũ, nhận mã qua email — không cần mật khẩu."
6. Chạy song song vài ngày, ổn rồi mới tắt Edubit.

---

## Đường dẫn chính

| Trang | Đường dẫn |
|---|---|
| Trang chủ / danh sách khóa | `/` |
| Trang bán 1 khóa | `/khoa-hoc/<slug>` |
| Khu học viên | `/hoc` |
| Quản trị | `/admin` |

## Khi nào nên trả tiền

| Dấu hiệu | Nâng cấp |
|---|---|
| Thấy link video bị chia sẻ lậu | Bunny Stream ~25.000đ/tháng |
| Netlify báo sắp hết hạn mức | Netlify Pro hoặc chuyển Vercel Pro (~500.000đ/tháng) |
| Trên 3.000 học viên đăng nhập/tháng | Resend Pro |
| Database gần 500MB | Supabase Pro (~650.000đ/tháng) |
