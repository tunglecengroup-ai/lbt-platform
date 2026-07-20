-- =============================================================
-- LBT Platform — Database schema
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ → Run
-- Chạy lại nhiều lần vẫn an toàn (if not exists / drop policy if exists)
-- Thứ tự: BẢNG → HÀM → POLICY → TRIGGER  (không đảo, vì phụ thuộc nhau)
-- =============================================================


-- =============================================================
-- PHẦN 1 — BẢNG
-- =============================================================

-- 1. PROFILES (mở rộng auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- 2. COURSES
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  description text,
  cover_gradient text default 'from-blue-500 to-indigo-600',
  instructor text default 'Lê Bá Tùng',
  price_vnd integer not null default 0,
  is_published boolean default false,
  position integer default 0,
  created_at timestamptz default now()
);
alter table public.courses enable row level security;

-- 3. CHAPTERS (chương)
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz default now()
);
create index if not exists chapters_course_pos_idx on public.chapters(course_id, position);
alter table public.chapters enable row level security;

-- 4. LESSONS (bài giảng)
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  youtube_id text,                          -- ID video YouTube unlisted
  duration_seconds integer default 0,
  position integer not null default 0,
  is_free_preview boolean default false,
  created_at timestamptz default now()
);
create index if not exists lessons_chapter_pos_idx on public.lessons(chapter_id, position);
create index if not exists lessons_course_idx on public.lessons(course_id);
alter table public.lessons enable row level security;

-- 5. LESSON RESOURCES (tài liệu đính kèm: link Drive, PDF...)
create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  label text not null,
  href text not null,
  position integer default 0
);
create index if not exists lesson_resources_lesson_idx on public.lesson_resources(lesson_id);
alter table public.lesson_resources enable row level security;

-- 6. ENROLLMENTS (ai được học khóa nào)
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active','expired','refunded')),
  enrolled_at timestamptz default now(),
  expires_at timestamptz,                   -- NULL = học trọn đời
  unique (user_id, course_id)
);
create index if not exists enrollments_user_idx on public.enrollments(user_id);
alter table public.enrollments enable row level security;

-- 7. PROGRESS (tiến độ từng bài)
create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  watched_seconds integer default 0,
  completed_at timestamptz,
  updated_at timestamptz default now(),
  unique (user_id, lesson_id)
);
create index if not exists progress_user_course_idx on public.progress(user_id, course_id);
alter table public.progress enable row level security;

-- 8. ORDERS (đơn mua khóa)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_email text,
  amount_vnd integer not null default 0,
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded')),
  payment_method text,                      -- 'casso' | 'vnpay' | 'momo' | 'pancake' | 'manual'
  tx_reference text,
  paid_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
alter table public.orders enable row level security;

-- 9. LEADS (CRM — chỉ admin đọc, qua service role phía server)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  source text,                              -- 'Facebook Ads' | 'Landing page' | 'YouTube' | ...
  campaign text,
  interest text,
  value_vnd integer default 0,
  stage text not null default 'moi'
    check (stage in ('moi','da-lien-he','quan-tam','dam-phan','chot','mat')),
  owner text,
  score integer default 50,
  note text,
  last_touch_at timestamptz default now(),
  created_at timestamptz default now()
);
create index if not exists leads_stage_idx on public.leads(stage);
alter table public.leads enable row level security;
-- Cố ý KHÔNG tạo policy cho leads -> chỉ service role (sau cổng admin) truy cập được


-- =============================================================
-- PHẦN 2 — HÀM (phải tạo sau bảng, trước policy dùng nó)
-- =============================================================

-- Kiểm tra user có quyền xem bài không
create or replace function public.can_watch_lesson(p_user_id uuid, p_lesson_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    -- 1) Bài học thử miễn phí
    select 1 from public.lessons l
    where l.id = p_lesson_id and l.is_free_preview = true
  ) or exists (
    -- 2) Đã được cấp quyền học khóa chứa bài này, còn hạn
    select 1
    from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = p_lesson_id
      and e.user_id = p_user_id
      and e.status = 'active'
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

-- Tự tạo profile khi có người đăng ký tài khoản
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;


-- =============================================================
-- PHẦN 3 — POLICY (quyền truy cập)
-- =============================================================

-- profiles: mỗi người chỉ thấy/sửa hồ sơ của mình
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- courses / chapters / lessons: ai cũng xem được nếu khóa đã publish
drop policy if exists "courses_select_published" on public.courses;
create policy "courses_select_published" on public.courses
  for select using (is_published = true);

drop policy if exists "chapters_select_published" on public.chapters;
create policy "chapters_select_published" on public.chapters
  for select using (
    exists (select 1 from public.courses c where c.id = course_id and c.is_published)
  );

drop policy if exists "lessons_select_published" on public.lessons;
create policy "lessons_select_published" on public.lessons
  for select using (
    exists (select 1 from public.courses c where c.id = course_id and c.is_published)
  );

-- lesson_resources: chỉ người có quyền xem bài mới thấy tài liệu
drop policy if exists "resources_select_entitled" on public.lesson_resources;
create policy "resources_select_entitled" on public.lesson_resources
  for select using (public.can_watch_lesson(auth.uid(), lesson_id));

-- enrollments / progress / orders: mỗi người chỉ thấy dữ liệu của mình
drop policy if exists "enrollments_select_own" on public.enrollments;
create policy "enrollments_select_own" on public.enrollments
  for select using (auth.uid() = user_id);

drop policy if exists "progress_all_own" on public.progress;
create policy "progress_all_own" on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select using (auth.uid() = user_id);


-- =============================================================
-- PHẦN 4 — TRIGGER
-- =============================================================

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
