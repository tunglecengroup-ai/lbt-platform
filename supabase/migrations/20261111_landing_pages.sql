-- =============================================================
-- Trang bán ghép khối (ladipage) trên hoc.lebatung.com/l/<slug>
-- + đo lường theo từng trang: lượt xem, bấm đăng ký, đơn, doanh thu, theo UTM
-- Chạy được nhiều lần (idempotent).
-- =============================================================

create table if not exists public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,                         -- tên nội bộ (vd "ADS 199K - bản A")
  course_id uuid references public.courses(id) on delete set null,
  plan_id uuid references public.membership_plans(id) on delete set null,
  price_vnd integer,                          -- giá riêng cho trang này (để trống = giá khóa)
  compare_price_vnd integer,
  theme_color text not null default '#e11d48',
  seo_title text,
  seo_description text,
  og_image text,
  sections jsonb not null default '[]'::jsonb, -- [{id, type, data}]
  is_published boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.landing_pages enable row level security;
-- Không policy: chỉ đọc/ghi qua service role phía server

create table if not exists public.landing_events (
  id bigint generated always as identity primary key,
  landing_id uuid not null references public.landing_pages(id) on delete cascade,
  kind text not null check (kind in ('view','checkout')),
  visitor_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  created_at timestamptz default now()
);
create index if not exists landing_events_landing_idx on public.landing_events(landing_id, created_at);
alter table public.landing_events enable row level security;

-- Đơn hàng nhớ nguồn: trang bán + UTM (để ra doanh thu thật theo camp/ad)
alter table public.orders add column if not exists landing_id uuid references public.landing_pages(id) on delete set null;
alter table public.orders add column if not exists utm_source text;
alter table public.orders add column if not exists utm_medium text;
alter table public.orders add column if not exists utm_campaign text;
alter table public.orders add column if not exists utm_content text;
alter table public.orders add column if not exists utm_term text;
create index if not exists orders_landing_idx on public.orders(landing_id);
