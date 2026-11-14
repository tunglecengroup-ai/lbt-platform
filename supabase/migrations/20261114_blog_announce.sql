-- Blog tự đăng đúng giờ: đánh dấu bài đã "lên sóng" (đã làm mới trang + báo IndexNow + Telegram)
alter table public.posts add column if not exists announced_at timestamptz;
-- Bài đã đăng từ trước: coi như đã báo, tránh báo lại hàng loạt
update public.posts set announced_at = published_at
where is_published = true and published_at <= now() and announced_at is null;
