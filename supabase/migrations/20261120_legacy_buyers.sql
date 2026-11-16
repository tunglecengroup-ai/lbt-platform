-- =============================================================
-- 17/11/2026: Học viên CŨ đã mua khóa (danh sách tab "sp2" trang tính TL GROUP / Edubit)
-- Ai trong danh sách đăng ký tài khoản (trùng EMAIL hoặc SỐ ĐIỆN THOẠI) -> tự mở khóa
-- "Facebook Ads Từ Cơ Bản Đến Nâng Cao", hạn = NGÀY MUA trong sp2 + 12 tháng.
-- Đã quá 12 tháng kể từ ngày mua thì không mở. Không tạo tài khoản, không gửi email.
-- Dữ liệu danh sách nạp riêng (REST) vào bảng legacy_buyers. Chạy được nhiều lần.
-- =============================================================

create table if not exists public.legacy_buyers (
  email text primary key,              -- chữ thường
  phone text,                          -- dạng 0xxxxxxxxx
  full_name text,
  purchased_at timestamptz not null,
  course_slug text not null default 'facebook-ads-co-ban-den-nang-cao',
  source text not null default 'sp2',
  created_at timestamptz default now()
);
create index if not exists legacy_buyers_phone_idx on public.legacy_buyers(phone);
alter table public.legacy_buyers enable row level security; -- không có policy: chỉ máy chủ (service role) đọc/ghi

/** Mở khóa cho 1 tài khoản nếu có trong danh sách. Trả về số khóa đã mở/cập nhật. */
create or replace function public.grant_legacy_course(p_user uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_email text; v_phone text; r record; v_course uuid; v_exp timestamptz; n int := 0;
begin
  select lower(email), regexp_replace(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '^84', '0')
    into v_email, v_phone from public.profiles where id = p_user;
  if v_email is null then return 0; end if;

  for r in
    select distinct on (course_slug) * from public.legacy_buyers
     where email = v_email or (length(v_phone) >= 9 and phone = v_phone)
     order by course_slug, purchased_at desc
  loop
    v_exp := r.purchased_at + interval '12 months';
    continue when v_exp <= now();
    select id into v_course from public.courses where slug = r.course_slug;
    continue when v_course is null;
    insert into public.enrollments (user_id, course_id, status, expires_at, source)
    values (p_user, v_course, 'active', v_exp, 'sp2-edubit')
    on conflict (user_id, course_id) do update
      set expires_at = case
            -- quyền do chính danh sách này cấp: đặt đúng theo ngày mua
            when enrollments.source = 'sp2-edubit' then excluded.expires_at
            -- quyền khác (mua mới, tặng, admin cấp) còn dài hơn thì giữ nguyên, không rút ngắn
            else greatest(coalesce(enrollments.expires_at, excluded.expires_at), excluded.expires_at)
          end,
          status = 'active';
    n := n + 1;
  end loop;
  return n;
end $$;

/** Chạy cho mọi tài khoản đang có (sau khi nạp danh sách) */
create or replace function public.grant_legacy_backfill()
returns int language plpgsql security definer set search_path = public as $$
declare p record; total int := 0;
begin
  for p in select id from public.profiles loop
    total := total + public.grant_legacy_course(p.id);
  end loop;
  return total;
end $$;
revoke all on function public.grant_legacy_course(uuid) from public, anon, authenticated;
revoke all on function public.grant_legacy_backfill() from public, anon, authenticated;
grant execute on function public.grant_legacy_backfill() to service_role;

-- Tự chạy khi có tài khoản mới, và khi học viên cập nhật số điện thoại (đăng ký lưu SĐT ngay sau khi tạo)
create or replace function public.on_profile_grant_legacy()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.grant_legacy_course(new.id);
  return new;
end $$;

drop trigger if exists on_profile_grant_legacy_ins on public.profiles;
create trigger on_profile_grant_legacy_ins
  after insert on public.profiles
  for each row execute function public.on_profile_grant_legacy();

drop trigger if exists on_profile_grant_legacy_upd on public.profiles;
create trigger on_profile_grant_legacy_upd
  after update of phone, email on public.profiles
  for each row when (new.phone is distinct from old.phone or new.email is distinct from old.email)
  execute function public.on_profile_grant_legacy();
