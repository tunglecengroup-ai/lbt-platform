-- =============================================================
-- Đăng bài đa kênh từ web: soạn 1 lần -> duyệt -> đăng / hẹn giờ ra Facebook, Instagram, Threads,
-- Telegram, Email (GetResponse); TikTok / YouTube / Zalo / Messenger: đóng gói sẵn để đăng tay.
-- Chạy được nhiều lần.
-- =============================================================

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,                       -- tên nội bộ + tiêu đề email
  body text not null default '',             -- nội dung chung (chữ thường, không HTML)
  link_path text,                            -- trang đích trên web (vd /khoa-hoc/x) -> mỗi kênh tự gắn mã theo dõi riêng
  fb_comment_link text,                      -- link pke.to cho bình luận đầu fanpage (luật chống spam)
  media jsonb not null default '[]'::jsonb,  -- [{url, type: "image"|"video"}]
  channels text[] not null default '{}',
  scheduled_at timestamptz,                  -- trống = đăng ngay khi duyệt
  status text not null default 'draft' check (status in ('draft','approved','done','partial','failed','cancelled')),
  check_warnings jsonb not null default '[]'::jsonb,
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists social_posts_status_idx on public.social_posts(status, scheduled_at);
alter table public.social_posts enable row level security;

create table if not exists public.social_deliveries (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  channel text not null,
  status text not null default 'pending' check (status in ('pending','scheduled','sent','failed','manual','cancelled')),
  run_at timestamptz not null default now(),
  external_id text,
  external_url text,
  comment_status text,                       -- Facebook: bình luận đầu chứa link (pending/sent/failed)
  error text,
  attempts int not null default 0,
  done_at timestamptz,
  created_at timestamptz default now(),
  unique (post_id, channel)
);
create index if not exists social_deliveries_due_idx on public.social_deliveries(status, run_at);
alter table public.social_deliveries enable row level security;

-- Kho ảnh công khai cho bài đăng (Facebook/Instagram/Threads cần link ảnh công khai)
insert into storage.buckets (id, name, public)
values ('social-media', 'social-media', true)
on conflict (id) do nothing;
