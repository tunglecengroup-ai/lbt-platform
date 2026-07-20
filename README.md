# LBT Platform

Phần mềm quản trị **học viên (LMS)** và **khách hàng (CRM)** cho Học viện Lê Bá Tùng.
Next.js 16 (App Router) · Tailwind v4 · recharts · lucide-react.

> ⚠️ Đây là khu vực **quản trị nội bộ**, có dữ liệu khách hàng. Luôn đặt sau lớp
> đăng nhập và nên chạy trên subdomain kín (vd `app.lebatung.com`), không dùng
> domain mặt tiền.

## Chạy local

```bash
npm install
npm run dev      # http://localhost:3000
```

## Biến môi trường (bắt buộc)

Tạo file `.env.local` (đã được gitignore) hoặc khai báo trên Vercel:

| Biến                            | Ý nghĩa                                                     |
| ------------------------------- | ----------------------------------------------------------- |
| `APP_PASSWORD`                  | Mật khẩu đăng nhập **khu admin**                            |
| `APP_SESSION_SECRET`            | Chuỗi ngẫu nhiên dài ký cookie phiên admin (đừng để lộ)     |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL project Supabase (công khai)                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Khóa anon Supabase (công khai, RLS bảo vệ dữ liệu)          |
| `SUPABASE_SERVICE_ROLE_KEY`     | Khóa quyền cao — **BÍ MẬT**, chỉ dùng phía server khu admin |

## Cài đặt database (Supabase)

1. Tạo project tại [supabase.com](https://supabase.com) (miễn phí), region Singapore.
2. **SQL Editor → New query** → dán toàn bộ `supabase/schema.sql` → **Run**.
3. Chạy tiếp `supabase/seed.sql` để có sẵn 2 khóa học mẫu.
4. **Project Settings → API** → copy 3 giá trị vào `.env.local` và Vercel.

> ⚠️ `seed.sql` chạy lại sẽ xóa & tạo lại chương/bài (mất tiến độ đã ghi). Chỉ chạy lúc khởi tạo.

Ví dụ:

```
APP_PASSWORD=doi-mat-khau-cua-ban
APP_SESSION_SECRET=chuoi-ngau-nhien-that-dai-64-ky-tu
```

Nếu **không** đặt 2 biến này, cổng đăng nhập sẽ mở khóa (tiện chạy thử, KHÔNG dùng cho production).

## Cấu trúc

- `src/app/(dashboard)/` — 6 trang: Tổng quan, CRM, Học viên, Khóa học, Đơn hàng, Automation
- `src/app/login/` — trang đăng nhập
- `src/app/api/login`, `src/app/api/logout` — xử lý phiên đăng nhập
- `src/proxy.ts` — cổng bảo vệ toàn site (Next.js 16 middleware)
- `src/lib/mock-data.ts` — **dữ liệu giả lập**; thay bằng query Supabase khi nối backend thật
- `src/components/` — bộ UI (card, badge, button, chart…) theo design token 3 lớp trong `globals.css`

## Deploy (Vercel)

1. Đẩy repo lên GitHub (private).
2. Vercel → Import repo → framework tự nhận Next.js → Deploy.
3. Settings → Environment Variables: thêm `APP_PASSWORD`, `APP_SESSION_SECRET`.
4. Settings → Domains: thêm `app.lebatung.com`, làm theo bản ghi CNAME Vercel chỉ dẫn.
