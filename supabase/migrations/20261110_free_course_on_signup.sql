-- =============================================================
-- 10/11/2026: Tặng khóa "Facebook Ads Từ Cơ Bản Đến Nâng Cao" cho MỌI tài khoản mới
-- (đăng ký trên web, tạo qua API, admin cấp tay…) — hạn 12 tháng.
-- Đổi khóa tặng: sửa slug trong hàm bên dưới rồi chạy lại.
-- =============================================================

create or replace function public.grant_signup_course()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_course uuid;
begin
  select id into v_course from public.courses where slug = 'facebook-ads-co-ban-den-nang-cao' limit 1;
  if v_course is not null then
    insert into public.enrollments (user_id, course_id, status, expires_at, source)
    values (new.id, v_course, 'active', now() + interval '365 days', 'tang-khi-dang-ky')
    on conflict (user_id, course_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_created_grant_course on public.profiles;
create trigger on_profile_created_grant_course
  after insert on public.profiles
  for each row execute function public.grant_signup_course();

-- Cấp luôn cho các tài khoản đã có mà chưa có khóa này
insert into public.enrollments (user_id, course_id, status, expires_at, source)
select p.id, c.id, 'active', now() + interval '365 days', 'tang-khi-dang-ky'
from public.profiles p
cross join public.courses c
where c.slug = 'facebook-ads-co-ban-den-nang-cao'
on conflict (user_id, course_id) do nothing;
