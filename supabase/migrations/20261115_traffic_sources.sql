-- =============================================================
-- Nguồn khách theo KÊNH (Facebook, TikTok, YouTube, Instagram, Threads, LinkedIn, Zalo, Telegram, Email, Google…)
-- Lượt ghé web + nguồn của tài khoản / đơn hàng / lead + link theo dõi đã tạo. Chạy được nhiều lần.
-- =============================================================

-- 1 dòng = 1 phiên ghé web (trình duyệt gửi 1 lần/phiên)
create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  visitor_id text,
  channel text not null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  landing text,
  is_first boolean not null default false, -- lần đầu thiết bị này ghé web
  created_at timestamptz default now()
);
create index if not exists site_visits_created_idx on public.site_visits(created_at);
create index if not exists site_visits_channel_idx on public.site_visits(channel, created_at);
alter table public.site_visits enable row level security;

-- Tài khoản học viên: nguồn lần đầu ghé + nguồn lúc đăng ký
alter table public.profiles add column if not exists first_channel text;
alter table public.profiles add column if not exists first_utm_source text;
alter table public.profiles add column if not exists first_utm_campaign text;
alter table public.profiles add column if not exists first_utm_content text;
alter table public.profiles add column if not exists first_referrer text;
alter table public.profiles add column if not exists first_landing text;
alter table public.profiles add column if not exists first_seen_at timestamptz;
alter table public.profiles add column if not exists signup_channel text;
alter table public.profiles add column if not exists signup_utm_campaign text;
alter table public.profiles add column if not exists signup_utm_content text;

-- Đơn hàng: kênh (lần chạm gần nhất trước khi mua) + kênh lần đầu biết tới web
alter table public.orders add column if not exists channel text;
alter table public.orders add column if not exists first_channel text;
alter table public.orders add column if not exists referrer text;
create index if not exists orders_channel_idx on public.orders(channel);

-- Lead (CRM): chuẩn hóa kênh + UTM
alter table public.leads add column if not exists channel text;
alter table public.leads add column if not exists utm_source text;
alter table public.leads add column if not exists utm_medium text;
alter table public.leads add column if not exists utm_campaign text;
alter table public.leads add column if not exists utm_content text;

-- Link theo dõi đã tạo trong Admin (để dùng lại + đối chiếu số liệu)
create table if not exists public.tracking_links (
  id uuid primary key default gen_random_uuid(),
  name text,
  channel text not null,
  utm_source text not null,
  utm_medium text not null,
  utm_campaign text not null,
  utm_content text,
  target_url text not null,
  full_url text not null,
  created_at timestamptz default now()
);
alter table public.tracking_links enable row level security;
-- Không policy: chỉ service role (sau cổng admin) đọc/ghi
