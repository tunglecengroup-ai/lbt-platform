-- Chiến dịch automation tùy biến: tạo/sửa/xóa, lọc theo khóa học, chiến dịch gửi theo NHÓM KHÁCH (broadcast).
-- Chạy được nhiều lần.
alter table public.automation_flows add column if not exists kind text not null default 'trigger';
alter table public.automation_flows drop constraint if exists automation_flows_kind_check;
alter table public.automation_flows add constraint automation_flows_kind_check check (kind in ('trigger', 'broadcast'));
alter table public.automation_flows add column if not exists course_ids uuid[] not null default '{}';  -- trống = mọi khóa
alter table public.automation_flows add column if not exists segment jsonb not null default '{}'::jsonb; -- nhóm khách cho broadcast
alter table public.automation_flows add column if not exists last_broadcast_at timestamptz;
alter table public.automation_flows add column if not exists last_broadcast_count integer;
alter table public.automation_flows add column if not exists updated_at timestamptz default now();
