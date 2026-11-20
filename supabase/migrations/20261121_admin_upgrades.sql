-- =============================================================
-- 21/11/2026: nâng cấp Admin
--  1. Đơn hàng: ghi chú của admin (đơn tạo tay, lý do sửa/hoàn tiền…)
--  2. Cảm nhận học viên: ẨN / HIỆN (ẩn = không hiện ở bất kỳ trang công khai nào, vẫn giữ trong Admin)
-- Chạy được nhiều lần. Chạy TRƯỚC khi đẩy code mới.
-- =============================================================

alter table public.orders add column if not exists admin_note text;

alter table public.reviews add column if not exists is_hidden boolean not null default false;

-- Khách (anon) chỉ đọc được cảm nhận đang HIỆN
drop policy if exists "reviews_select_all" on public.reviews;
create policy "reviews_select_all" on public.reviews for select using (not is_hidden);

select 'orders.admin_note' as cot, count(*) as so_dong from public.orders
union all
select 'reviews dang hien', count(*) from public.reviews where not is_hidden;
