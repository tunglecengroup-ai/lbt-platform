-- =============================================================
-- LBT Platform — Dữ liệu khởi tạo (2 khóa học mẫu)
-- Chạy SAU schema.sql: SQL Editor → New query → dán → Run
--
-- ⚠️ Chạy lại file này sẽ XÓA và tạo lại chương/bài của 2 khóa dưới đây
--    (kéo theo mất tiến độ học đã ghi của các bài đó).
--    Sau khi có học viên thật, đừng chạy lại — hãy sửa nội dung trực tiếp.
-- =============================================================

-- ---------- KHÓA 1 ----------
insert into public.courses (slug, title, subtitle, cover_gradient, price_vnd, is_published, position)
values (
  'fb-ads-cam-tay',
  'FB Ads cầm tay chỉ việc',
  'Từ số 0 đến chạy quảng cáo ra đơn đều tay',
  'from-blue-500 to-indigo-600',
  199000, true, 1
)
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  cover_gradient = excluded.cover_gradient,
  price_vnd = excluded.price_vnd,
  is_published = excluded.is_published,
  position = excluded.position;

delete from public.chapters
where course_id = (select id from public.courses where slug = 'fb-ads-cam-tay');

-- Chương 1
with c as (select id from public.courses where slug = 'fb-ads-cam-tay'),
ch as (
  insert into public.chapters (course_id, title, position)
  select id, 'Chương 1 — Nhập môn & tư duy', 1 from c
  returning id, course_id
)
insert into public.lessons (chapter_id, course_id, title, duration_seconds, position, is_free_preview)
select ch.id, ch.course_id, v.title, v.dur, v.pos, v.free
from ch, (values
  ('Chào mừng & lộ trình khóa học', 412, 1, true),
  ('Tư duy đúng về quảng cáo Facebook', 934, 2, true),
  ('Hiểu về hệ sinh thái Meta Business', 1120, 3, false)
) as v(title, dur, pos, free);

-- Chương 2
with c as (select id from public.courses where slug = 'fb-ads-cam-tay'),
ch as (
  insert into public.chapters (course_id, title, position)
  select id, 'Chương 2 — Cài đặt nền tảng & Pixel', 2 from c
  returning id, course_id
)
insert into public.lessons (chapter_id, course_id, title, duration_seconds, position, is_free_preview)
select ch.id, ch.course_id, v.title, v.dur, v.pos, v.free
from ch, (values
  ('Tạo Business Manager chuẩn chống khóa', 1345, 1, false),
  ('Cài Pixel & Conversion API', 1580, 2, false),
  ('Tạo tài khoản quảng cáo & thẻ thanh toán', 872, 3, false)
) as v(title, dur, pos, free);

-- Chương 3
with c as (select id from public.courses where slug = 'fb-ads-cam-tay'),
ch as (
  insert into public.chapters (course_id, title, position)
  select id, 'Chương 3 — Lên chiến dịch đầu tiên', 3 from c
  returning id, course_id
)
insert into public.lessons (chapter_id, course_id, title, duration_seconds, position, is_free_preview)
select ch.id, ch.course_id, v.title, v.dur, v.pos, v.free
from ch, (values
  ('Cấu trúc chiến dịch 1-3-1 kinh điển', 1640, 1, false),
  ('Target đúng tệp khách hàng', 1892, 2, false),
  ('Viết content & làm creative đúng chuẩn', 1455, 3, false),
  ('Bấm nút xuất bản & đọc chỉ số ngày đầu', 1077, 4, false)
) as v(title, dur, pos, free);

-- Chương 4
with c as (select id from public.courses where slug = 'fb-ads-cam-tay'),
ch as (
  insert into public.chapters (course_id, title, position)
  select id, 'Chương 4 — Tối ưu & Scale', 4 from c
  returning id, course_id
)
insert into public.lessons (chapter_id, course_id, title, duration_seconds, position, is_free_preview)
select ch.id, ch.course_id, v.title, v.dur, v.pos, v.free
from ch, (values
  ('Đọc báo cáo: chỉ số nào thật sự quan trọng', 1320, 1, false),
  ('Khi nào tắt, khi nào giữ, khi nào scale', 1710, 2, false),
  ('Nhân bản chiến dịch win theo tỉnh', 1188, 3, false)
) as v(title, dur, pos, free);


-- ---------- KHÓA 2 ----------
insert into public.courses (slug, title, subtitle, cover_gradient, price_vnd, is_published, position)
values (
  'combo-ads-pro',
  'Combo Ads Pro — Scale 100tr/tháng',
  'Dành cho người đã chạy ads, muốn bứt phá ngân sách lớn',
  'from-violet-500 to-fuchsia-600',
  4990000, true, 2
)
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  cover_gradient = excluded.cover_gradient,
  price_vnd = excluded.price_vnd,
  is_published = excluded.is_published,
  position = excluded.position;

delete from public.chapters
where course_id = (select id from public.courses where slug = 'combo-ads-pro');

with c as (select id from public.courses where slug = 'combo-ads-pro'),
ch as (
  insert into public.chapters (course_id, title, position)
  select id, 'Chương 1 — Nền tảng scale', 1 from c
  returning id, course_id
)
insert into public.lessons (chapter_id, course_id, title, duration_seconds, position, is_free_preview)
select ch.id, ch.course_id, v.title, v.dur, v.pos, v.free
from ch, (values
  ('Tư duy scale không vỡ tài khoản', 1240, 1, true),
  ('Cấu trúc CBO cho ngân sách lớn', 1670, 2, false),
  ('Quản trị nhiều tài khoản quảng cáo', 1410, 3, false)
) as v(title, dur, pos, free);

with c as (select id from public.courses where slug = 'combo-ads-pro'),
ch as (
  insert into public.chapters (course_id, title, position)
  select id, 'Chương 2 — Vận hành đội nhóm', 2 from c
  returning id, course_id
)
insert into public.lessons (chapter_id, course_id, title, duration_seconds, position, is_free_preview)
select ch.id, ch.course_id, v.title, v.dur, v.pos, v.free
from ch, (values
  ('Phân bổ ngân sách theo ROAS thật', 1530, 1, false),
  ('Báo cáo & ra quyết định hằng ngày', 1290, 2, false)
) as v(title, dur, pos, free);


-- ---------- TÀI LIỆU ĐÍNH KÈM (ví dụ — thay link Drive thật của anh vào) ----------
insert into public.lesson_resources (lesson_id, label, href, position)
select l.id, 'Checklist cài đặt BM (PDF)', 'https://drive.google.com/', 1
from public.lessons l
where l.title = 'Tạo Business Manager chuẩn chống khóa';

insert into public.lesson_resources (lesson_id, label, href, position)
select l.id, 'File hướng dẫn gắn Pixel (Drive)', 'https://drive.google.com/', 1
from public.lessons l
where l.title = 'Cài Pixel & Conversion API';
