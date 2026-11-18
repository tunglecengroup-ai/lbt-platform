-- =============================================================
-- 18/11/2026: CHĂM SÓC QUA ZALO cho khách đăng ký chưa thanh toán (mọi khóa).
--  • Kênh mới 'zalo' cho các bước automation (bên cạnh email/telegram). Bỏ kênh Messenger theo lệnh anh.
--  • Gửi Zalo theo 2 đường: ZNS của Zalo OA (khi đã cấu hình + bước có mã mẫu ZNS) -> nếu chưa có thì
--    đưa vào HÀNG CHỜ zalo_outbox để tiện ích Chrome "Zalo CSKH" gửi bằng Zalo cá nhân trên máy anh.
--  • Sự kiện mới 'lead_registered' = đơn ladi Webcake chưa thanh toán trên Pancake POS (cron quét 5 phút,
--    lib/pos-leads.ts) hoặc lead gửi vào /api/v1/leads. Mục tiêu dừng mới 'paid_any' = khách đã có đơn trả tiền / đã mua khóa (theo email hoặc SĐT).
--  • Kịch bản 'abandoned-checkout' (đơn chờ trên web học) được chèn thêm 2 bước Zalo.
-- Chạy được nhiều lần.
-- =============================================================

alter table public.automation_steps drop constraint if exists automation_steps_channel_check;
alter table public.automation_steps add constraint automation_steps_channel_check check (channel in ('email', 'telegram', 'zalo'));
alter table public.automation_steps add column if not exists zns_template_id text;   -- mã mẫu ZNS đã duyệt (bỏ trống = chỉ gửi Zalo cá nhân)

alter table public.automation_runs add column if not exists phone text;               -- 0xxxxxxxxx
create index if not exists automation_runs_phone_idx on public.automation_runs(phone) where phone is not null;

alter table public.automation_messages add column if not exists phone text;
alter table public.automation_messages drop constraint if exists automation_messages_status_check;
alter table public.automation_messages add constraint automation_messages_status_check check (status in ('sent', 'failed', 'skipped', 'queued'));
create index if not exists automation_messages_phone_idx on public.automation_messages(phone, sent_at desc) where phone is not null;

-- Hàng chờ tin Zalo cá nhân (tiện ích Chrome lấy về gửi qua chat.zalo.me)
create table if not exists public.zalo_outbox (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.automation_messages(id) on delete set null,
  run_id uuid references public.automation_runs(id) on delete set null,
  phone text not null,
  name text,
  text text not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0,
  error text,
  created_at timestamptz default now(),
  claimed_at timestamptz,
  sent_at timestamptz
);
create index if not exists zalo_outbox_pending_idx on public.zalo_outbox(status, created_at);
alter table public.zalo_outbox enable row level security;

-- Token Zalo OA (access token 25 giờ, refresh token dùng 1 lần, 3 tháng) — chỉ server đọc
create table if not exists public.zalo_oa_tokens (
  id integer primary key default 1 check (id = 1),
  access_token text,
  refresh_token text not null,
  expires_at timestamptz,
  updated_at timestamptz default now()
);
alter table public.zalo_oa_tokens enable row level security;

-- Lead từ form ladi (Webcake) — lưu lại để đối chiếu & dừng chuỗi khi khách trả tiền
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text,
  email text,
  campaign text,            -- mã chiến dịch Sheet (ABM-T11-26)
  course_code text,         -- mã khóa Sheet (ABM)
  course_title text,
  page_url text,
  utm jsonb not null default '{}'::jsonb,
  source text not null default 'webcake',
  external_id text unique,  -- pos:<id đơn Pancake POS>
  created_at timestamptz default now()
);
alter table public.leads add column if not exists external_id text unique;
create index if not exists leads_phone_idx on public.leads(phone);
create index if not exists leads_email_idx on public.leads(email);
alter table public.leads enable row level security;

-- ---------- Nội dung ----------
create or replace function pg_temp.put_step(p_flow text, p_pos int, p_delay int, p_channel text, p_tx boolean, p_subject text, p_body text)
returns void language plpgsql as $$
declare v_flow uuid;
begin
  select id into v_flow from public.automation_flows where key = p_flow;
  if v_flow is null then return; end if;
  if not exists (select 1 from public.automation_steps where flow_id = v_flow and position = p_pos) then
    insert into public.automation_steps (flow_id, position, delay_minutes, channel, subject, body, transactional, is_active)
    values (v_flow, p_pos, p_delay, p_channel, p_subject, p_body, p_tx, true);
  end if;
end $$;

-- 1. Đơn chờ trên web học: chèn Zalo vào bước 2 (5 phút sau email nhắc đầu) và bước cuối (ngày 3)
do $$
declare v_flow uuid;
begin
  select id into v_flow from public.automation_flows where key = 'abandoned-checkout';
  if v_flow is not null and not exists (select 1 from public.automation_steps where flow_id = v_flow and channel = 'zalo') then
    update public.automation_steps set position = position + 1 where flow_id = v_flow and position >= 2;
    insert into public.automation_steps (flow_id, position, delay_minutes, channel, subject, body, transactional, is_active) values
    (v_flow, 2, 5, 'zalo', 'Zalo nhắc đơn chờ',
     $b$<p>Chào {{ten}}, em là trợ lý của anh Lê Bá Tùng.</p><p>Đơn {{ma_don}} khóa {{khoa_hoc}} ({{so_tien}}) của anh/chị đang chờ chuyển khoản. Trang thanh toán có sẵn mã QR, chuyển xong hệ thống tự mở khóa:</p><p>{{link_don_hang}}</p><p>Anh/chị cần hỏi gì về khóa thì nhắn lại em ngay tại đây nhé.</p>$b$, false, true);
    insert into public.automation_steps (flow_id, position, delay_minutes, channel, subject, body, transactional, is_active)
    select v_flow, coalesce(max(position), 0) + 1, 2880, 'zalo', 'Zalo hỏi thăm ngày 3',
     $b$<p>Chào {{ten}}, đơn khóa {{khoa_hoc}} của anh/chị vẫn đang giữ chỗ.</p><p>Nếu anh/chị còn băn khoăn nội dung khóa có hợp với mình không, cứ nhắn em câu hỏi, em gửi anh/chị phần mục lục và bài học thử để xem trước.</p><p>Thanh toán: {{link_don_hang}}</p>$b$, false, true
      from public.automation_steps where flow_id = v_flow;
  end if;
end $$;

-- 2. Lead form ladi Webcake chưa thanh toán: email + Zalo, dừng khi khách đã trả tiền
insert into public.automation_flows (key, name, description, trigger, goal, is_active, kind)
values ('lead-ladi', 'Lead ladi chưa thanh toán: email + Zalo',
        'Đơn ladi Webcake (Pancake POS, mọi khóa) chưa thanh toán sau 15 phút. Gửi email + Zalo, tự dừng khi khách đã trả tiền (web học hoặc POS).',
        'lead_registered', 'paid_any', true, 'trigger')
on conflict (key) do nothing;

select pg_temp.put_step('lead-ladi', 1, 15, 'email', false,
 'Đã nhận đăng ký {{khoa_hoc}} của {{ten}}',
 $b$<p>Chào {{ten}},</p><p>Học viện đã nhận đăng ký khóa <b>{{khoa_hoc}}</b> của anh/chị.</p><p>Chỗ của anh/chị chỉ được giữ khi hoàn tất chuyển khoản. Nếu lúc nãy anh/chị chưa kịp thanh toán, cứ trả lời email này hoặc nhắn Zalo 0869 126 363, đội ngũ gửi lại thông tin chuyển khoản ngay.</p><p>Lê Bá Tùng</p>$b$);

select pg_temp.put_step('lead-ladi', 2, 2, 'zalo', false,
 'Zalo chào lead mới',
 $b$<p>Chào {{ten}}, em là trợ lý của anh Lê Bá Tùng.</p><p>Em thấy anh/chị vừa đăng ký khóa {{khoa_hoc}} nhưng chưa hoàn tất chuyển khoản. Anh/chị cần em gửi lại thông tin thanh toán, hay còn câu hỏi gì về khóa không ạ?</p>$b$);

select pg_temp.put_step('lead-ladi', 3, 1440, 'email', false,
 '{{ten}} còn vướng gì với khóa {{khoa_hoc}}?',
 $b$<p>Chào {{ten}},</p><p>Hôm qua anh/chị đăng ký khóa <b>{{khoa_hoc}}</b> nhưng đơn chưa thanh toán.</p><p>Người ta hay dừng ở bước này vì 3 lý do: chưa rõ khóa có hợp trình độ mình không, chưa biết học xong áp dụng vào việc gì, hoặc đơn giản là bận quên. Lý do nào thì anh/chị cứ trả lời email này, tôi đọc hết.</p><p><a href="{{link_khoa_hoc}}">Xem lại các khóa học</a></p><p>Lê Bá Tùng</p>$b$);

select pg_temp.put_step('lead-ladi', 4, 1440, 'zalo', false,
 'Zalo hỏi thăm ngày 2',
 $b$<p>Chào {{ten}}, em nhắn lại về khóa {{khoa_hoc}} anh/chị đăng ký hôm trước.</p><p>Nếu anh/chị muốn xem thử vài bài trước khi quyết, em gửi link học thử miễn phí. Anh/chị nhắn "học thử" là em gửi liền ạ.</p>$b$);

-- Kiểm tra
select 'buoc zalo abandoned-checkout' as kiem_tra, count(*)::text as ket_qua
  from public.automation_steps s join public.automation_flows f on f.id = s.flow_id where f.key = 'abandoned-checkout' and s.channel = 'zalo'
union all
select 'so buoc lead-ladi', count(*)::text
  from public.automation_steps s join public.automation_flows f on f.id = s.flow_id where f.key = 'lead-ladi'
union all
select 'bang zalo_outbox', (to_regclass('public.zalo_outbox') is not null)::text;
