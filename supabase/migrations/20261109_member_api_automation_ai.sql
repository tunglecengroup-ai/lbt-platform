-- =============================================================
-- Đợt 09/11/2026: Thành viên (Member) · API ngoài · Automation · Công cụ AI
-- Chạy được nhiều lần (if not exists / or replace). Chạy SAU schema.sql.
-- =============================================================

-- ---------- 1. CHƯƠNG TRÌNH THÀNH VIÊN ----------
create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text,
  description text,
  price_vnd integer not null default 0,
  compare_price_vnd integer,
  duration_days integer not null default 365 check (duration_days between 1 and 365),
  perks text[] not null default '{}',
  course_scope text not null default 'all' check (course_scope in ('all', 'selected')),
  course_ids uuid[] not null default '{}',
  tools_access boolean not null default true,       -- được dùng bộ công cụ AI
  ai_daily_quota integer not null default 30,       -- số lượt AI / ngày
  gr_campaign_id text,                              -- list GetResponse khi thành viên mới
  is_published boolean not null default false,
  is_featured boolean not null default false,
  position integer not null default 0,
  created_at timestamptz default now()
);
alter table public.membership_plans enable row level security;
drop policy if exists "plans_select_published" on public.membership_plans;
create policy "plans_select_published" on public.membership_plans for select using (is_published = true);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.membership_plans(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source text,                                     -- 'order' | 'admin' | 'api'
  order_id uuid,
  created_at timestamptz default now()
);
create index if not exists memberships_user_idx on public.memberships(user_id);
alter table public.memberships enable row level security;
drop policy if exists "memberships_select_own" on public.memberships;
create policy "memberships_select_own" on public.memberships for select using (auth.uid() = user_id);

-- Đơn hàng có thể là mua gói thành viên
alter table public.orders add column if not exists plan_id uuid references public.membership_plans(id) on delete set null;
-- Ghi danh sinh ra từ gói thành viên (để gia hạn/thu hồi theo gói)
alter table public.enrollments add column if not exists source text;

-- ---------- 2. API CHO HỆ THỐNG NGOÀI ----------
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_prefix text not null,                        -- 8 ký tự đầu để nhận diện
  key_hash text not null unique,                   -- sha256(key) — không lưu khóa gốc
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now()
);
alter table public.api_keys enable row level security;

create table if not exists public.api_requests (
  id uuid primary key default gen_random_uuid(),
  key_id uuid references public.api_keys(id) on delete set null,
  endpoint text not null,
  external_id text,                                -- mã đơn bên hệ thống ngoài (chống tạo trùng)
  status_code integer not null,
  request jsonb,
  response jsonb,
  created_at timestamptz default now()
);
create unique index if not exists api_requests_idem_idx on public.api_requests(key_id, endpoint, external_id)
  where external_id is not null and status_code < 300;
create index if not exists api_requests_created_idx on public.api_requests(created_at desc);
alter table public.api_requests enable row level security;

-- ---------- 3. AUTOMATION CHĂM SÓC KHÁCH HÀNG ----------
create table if not exists public.automation_flows (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  trigger text not null,                           -- signup | enrolled | order_pending | order_paid | inactive | expiring | course_completed | membership_started
  goal text,                                       -- điều kiện dừng: enrolled | order_paid | active_again ...
  is_active boolean not null default false,
  created_at timestamptz default now()
);
alter table public.automation_flows enable row level security;

create table if not exists public.automation_steps (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.automation_flows(id) on delete cascade,
  position integer not null default 0,
  delay_minutes integer not null default 0,        -- chờ bao lâu sau bước trước (bước 1: sau khi kích hoạt)
  channel text not null default 'email' check (channel in ('email', 'telegram')),
  subject text,
  body text not null default '',                   -- HTML/markdown đơn giản, có biến {{ten}} {{khoa_hoc}} ...
  transactional boolean not null default false,    -- email giao dịch: bỏ qua giới hạn tần suất & giờ yên lặng
  is_active boolean not null default true,
  created_at timestamptz default now()
);
create index if not exists automation_steps_flow_idx on public.automation_steps(flow_id, position);
alter table public.automation_steps enable row level security;

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.automation_flows(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  context jsonb not null default '{}',             -- khoa_hoc, link, ma_don, so_tien...
  dedupe_key text not null,                        -- 1 người không vào cùng 1 kịch bản 2 lần cho cùng sự kiện
  step_index integer not null default 0,
  next_run_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'done', 'stopped', 'error')),
  stop_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (flow_id, dedupe_key)
);
create index if not exists automation_runs_due_idx on public.automation_runs(status, next_run_at);
alter table public.automation_runs enable row level security;

create table if not exists public.automation_messages (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.automation_runs(id) on delete cascade,
  step_id uuid references public.automation_steps(id) on delete set null,
  flow_id uuid references public.automation_flows(id) on delete cascade,
  email text not null,
  channel text not null default 'email',
  subject text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error text,
  provider_id text,
  sent_at timestamptz default now(),
  opened_at timestamptz,
  clicked_at timestamptz
);
create index if not exists automation_messages_email_idx on public.automation_messages(email, sent_at desc);
create index if not exists automation_messages_flow_idx on public.automation_messages(flow_id, sent_at desc);
alter table public.automation_messages enable row level security;

-- Hủy nhận email marketing (bắt buộc theo chuẩn CAN-SPAM / GDPR / Nghị định 91/2020)
create table if not exists public.email_suppressions (
  email text primary key,
  reason text not null default 'unsubscribe',
  created_at timestamptz default now()
);
alter table public.email_suppressions enable row level security;

-- ---------- 4. CÔNG CỤ AI CHO HỌC VIÊN ----------
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null,
  input_tokens integer default 0,
  output_tokens integer default 0,
  created_at timestamptz default now()
);
create index if not exists ai_usage_user_day_idx on public.ai_usage(user_id, created_at desc);
alter table public.ai_usage enable row level security;
drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own" on public.ai_usage for select using (auth.uid() = user_id);

-- ---------- 5. DỮ LIỆU MẶC ĐỊNH ----------
-- Gói thành viên mẫu (ẩn — anh duyệt giá rồi bật hiển thị trong Admin → Thành viên)
insert into public.membership_plans (slug, name, tagline, description, price_vnd, compare_price_vnd, duration_days, perks, is_featured, position)
values
  ('member-12-thang', 'LBT Member 12 tháng', 'Học tất cả khóa + bộ công cụ AI quảng cáo',
   'Một lần đăng ký, mở khóa toàn bộ khóa học hiện có và khóa mới ra mắt trong thời gian thành viên, kèm bộ công cụ AI hỗ trợ chạy quảng cáo.',
   2990000, 5990000, 365,
   array['Học tất cả khóa học (kể cả khóa mới ra trong 12 tháng)',
         'Bộ công cụ AI: viết content, chấm điểm quảng cáo, chấm điểm fanpage, tạo landing',
         '30 lượt dùng AI mỗi ngày',
         'Ưu tiên hỗ trợ trong nhóm học viên',
         'Cập nhật thuật toán Facebook Ads mới nhất'], true, 1),
  ('member-3-thang', 'LBT Member 3 tháng', 'Trải nghiệm đầy đủ trong 3 tháng',
   'Học tất cả khóa học và dùng bộ công cụ AI trong 90 ngày.',
   990000, 1490000, 90,
   array['Học tất cả khóa học trong 90 ngày',
         'Bộ công cụ AI quảng cáo — 15 lượt/ngày',
         'Hỗ trợ trong nhóm học viên'], false, 2)
on conflict (slug) do nothing;
update public.membership_plans set ai_daily_quota = 15 where slug = 'member-3-thang' and ai_daily_quota = 30;

-- Kịch bản chăm sóc mặc định (TẮT sẵn — anh đọc nội dung rồi bật trong Admin → Automation)
insert into public.automation_flows (key, name, description, trigger, goal) values
  ('welcome-signup', 'Chào mừng tài khoản mới', 'Người vừa đăng ký nhưng chưa mua: chào mừng → giá trị → mời học thử/mua. Dừng khi họ mua khóa.', 'signup', 'enrolled'),
  ('onboarding-enrolled', 'Hướng dẫn học viên mới', 'Vừa được mở khóa: hướng dẫn vào học → nhắc bài đầu tiên.', 'enrolled', null),
  ('abandoned-checkout', 'Nhắc đơn chưa thanh toán', 'Tạo đơn nhưng chưa chuyển khoản: nhắc sau 1 giờ và 24 giờ. Dừng khi đơn được thanh toán.', 'order_pending', 'order_paid'),
  ('order-paid', 'Xác nhận thanh toán', 'Email giao dịch ngay khi đơn được thanh toán.', 'order_paid', null),
  ('reengage-inactive', 'Nhắc học — 7 ngày không vào', 'Học viên còn hạn nhưng 7 ngày chưa học bài nào. Dừng khi họ học lại.', 'inactive', 'active_again'),
  ('expiring-soon', 'Sắp hết hạn học', 'Còn 7 ngày hết hạn khóa: mời gia hạn / lên Member.', 'expiring', null),
  ('course-completed', 'Chúc mừng hoàn thành khóa', 'Học xong 100% bài: chúc mừng + xin cảm nhận + giới thiệu bước tiếp theo.', 'course_completed', null),
  ('member-welcome', 'Chào mừng thành viên', 'Ngay khi kích hoạt gói Member.', 'membership_started', null)
on conflict (key) do nothing;

-- Các bước email (chỉ chèn khi kịch bản chưa có bước nào)
do $$
declare f record;
begin
  for f in select id, key from public.automation_flows loop
    if exists (select 1 from public.automation_steps where flow_id = f.id) then continue; end if;
    if f.key = 'welcome-signup' then
      insert into public.automation_steps (flow_id, position, delay_minutes, subject, body) values
      (f.id, 1, 5, 'Chào {{ten}}, tài khoản Học viện Lê Bá Tùng đã sẵn sàng',
       '<p>Chào {{ten}},</p><p>Cảm ơn anh/chị đã tạo tài khoản tại Học viện Lê Bá Tùng. Đây là nơi tôi chia sẻ lại những gì đã làm thật sau 10 năm chạy quảng cáo — không lý thuyết suông.</p><p>Bắt đầu bằng video học thử miễn phí: <a href="{{link_trang_chu}}">xem ngay</a>.</p><p>Lê Bá Tùng</p>'),
      (f.id, 2, 2880, '3 lỗi khiến quảng cáo Facebook đốt tiền mà không ra đơn',
       '<p>Chào {{ten}},</p><p>Phần lớn người mới mất tiền vì 3 lỗi: nhắm đối tượng quá rộng, nội dung không nói đúng nỗi đau khách hàng, và tắt/bật quảng cáo quá sớm.</p><p>Trong các khóa học tôi hướng dẫn cách tránh từng lỗi bằng quy trình làm theo được. <a href="{{link_khoa_hoc}}">Xem các khóa học</a>.</p><p>Lê Bá Tùng</p>'),
      (f.id, 3, 4320, '{{ten}} ơi, ưu đãi thành viên dành cho anh/chị',
       '<p>Chào {{ten}},</p><p>Nếu anh/chị muốn học bài bản và có thêm bộ công cụ AI hỗ trợ viết content, chấm điểm quảng cáo, chấm điểm fanpage — gói LBT Member mở toàn bộ khóa học trong 12 tháng.</p><p><a href="{{link_thanh_vien}}">Xem gói thành viên</a></p><p>Lê Bá Tùng</p>');
    elsif f.key = 'onboarding-enrolled' then
      insert into public.automation_steps (flow_id, position, delay_minutes, subject, body, transactional) values
      (f.id, 1, 0, 'Đã mở khóa: {{khoa_hoc}} — cách vào học',
       '<p>Chào {{ten}},</p><p>Khóa <b>{{khoa_hoc}}</b> đã được mở cho tài khoản {{email}}.</p><p>Cách vào học: mở <a href="{{link_hoc}}">{{link_hoc}}</a>, nhập đúng email này, nhận mã đăng nhập trong hộp thư là vào học được ngay (không cần mật khẩu).</p><p>Chúc anh/chị học tốt!</p>', true),
      (f.id, 2, 4320, '{{ten}} đã xem bài đầu tiên của {{khoa_hoc}} chưa?',
       '<p>Chào {{ten}},</p><p>Người học hiệu quả nhất là người xem bài đầu tiên trong 3 ngày đầu. Chỉ cần 15 phút hôm nay: <a href="{{link_hoc}}">vào học ngay</a>.</p>', false);
    elsif f.key = 'abandoned-checkout' then
      insert into public.automation_steps (flow_id, position, delay_minutes, subject, body, transactional) values
      (f.id, 1, 60, 'Đơn {{ma_don}} đang chờ thanh toán',
       '<p>Chào {{ten}},</p><p>Đơn <b>{{ma_don}}</b> ({{khoa_hoc}} — {{so_tien}}) vẫn đang chờ chuyển khoản. Mã QR thanh toán vẫn còn hiệu lực tại: <a href="{{link_don_hang}}">{{link_don_hang}}</a>.</p><p>Chuyển khoản xong hệ thống tự mở khóa trong vài giây.</p>', true),
      (f.id, 2, 1380, 'Còn vướng gì khi đăng ký {{khoa_hoc}}?',
       '<p>Chào {{ten}},</p><p>Nếu anh/chị còn câu hỏi trước khi đăng ký, cứ trả lời email này hoặc nhắn fanpage, tôi hỗ trợ ngay. Đơn của anh/chị: <a href="{{link_don_hang}}">thanh toán tại đây</a>.</p>', false);
    elsif f.key = 'order-paid' then
      insert into public.automation_steps (flow_id, position, delay_minutes, subject, body, transactional) values
      (f.id, 1, 0, 'Xác nhận thanh toán đơn {{ma_don}}',
       '<p>Chào {{ten}},</p><p>Đã nhận {{so_tien}} cho đơn <b>{{ma_don}}</b> ({{khoa_hoc}}). Quyền học đã được mở.</p><p>Vào học: <a href="{{link_hoc}}">{{link_hoc}}</a></p><p>Cảm ơn anh/chị đã tin tưởng!</p>', true);
    elsif f.key = 'reengage-inactive' then
      insert into public.automation_steps (flow_id, position, delay_minutes, subject, body) values
      (f.id, 1, 0, '{{ten}} ơi, khóa học vẫn đang chờ anh/chị',
       '<p>Chào {{ten}},</p><p>Đã 7 ngày anh/chị chưa vào học. Chạy quảng cáo giỏi là nhờ đều đặn, mỗi ngày một bài nhỏ. <a href="{{link_hoc}}">Học tiếp bài đang dở</a>.</p>'),
      (f.id, 2, 7200, 'Một mẹo nhỏ để học xong khóa',
       '<p>Chào {{ten}},</p><p>Hãy đặt lịch cố định 20 phút mỗi tối và áp dụng ngay vào tài khoản quảng cáo của mình. <a href="{{link_hoc}}">Quay lại học</a>.</p>');
    elsif f.key = 'expiring-soon' then
      insert into public.automation_steps (flow_id, position, delay_minutes, subject, body) values
      (f.id, 1, 0, 'Khóa {{khoa_hoc}} còn 7 ngày nữa hết hạn',
       '<p>Chào {{ten}},</p><p>Quyền học <b>{{khoa_hoc}}</b> sẽ hết hạn ngày {{ngay_het_han}}. Để học tiếp tất cả khóa trong 12 tháng, xem <a href="{{link_thanh_vien}}">gói LBT Member</a>.</p>');
    elsif f.key = 'course-completed' then
      insert into public.automation_steps (flow_id, position, delay_minutes, subject, body) values
      (f.id, 1, 0, 'Chúc mừng {{ten}} đã hoàn thành {{khoa_hoc}}!',
       '<p>Chào {{ten}},</p><p>Chúc mừng anh/chị đã học xong <b>{{khoa_hoc}}</b>! Chứng nhận hoàn thành có mã xác minh đã sẵn sàng: <a href="{{link_chung_nhan}}">nhận chứng nhận</a> — in, lưu PDF hoặc khoe lên Facebook.</p><p>Anh/chị có thể gửi tôi vài dòng cảm nhận bằng cách trả lời email này.</p><p>Bước tiếp theo: <a href="{{link_khoa_hoc}}">các khóa nâng cao</a>.</p>');
    elsif f.key = 'member-welcome' then
      insert into public.automation_steps (flow_id, position, delay_minutes, subject, body, transactional) values
      (f.id, 1, 0, 'Chào mừng thành viên {{goi_thanh_vien}}',
       '<p>Chào {{ten}},</p><p>Gói <b>{{goi_thanh_vien}}</b> đã kích hoạt tới {{ngay_het_han}}. Tất cả khóa học và bộ công cụ AI đã mở trong <a href="{{link_hoc}}">khu học tập</a>.</p>', true);
    end if;
  end loop;
end $$;

-- ---------- 6. THỐNG KÊ TIẾN ĐỘ (dùng cho trang Học viên, không phải tải từng dòng progress) ----------
create or replace function public.progress_counts()
returns table (user_id uuid, course_id uuid, done integer, last_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.course_id,
         count(*) filter (where p.completed_at is not null)::int as done,
         max(coalesce(p.updated_at, p.completed_at)) as last_at
  from public.progress p
  group by p.user_id, p.course_id;
$$;
revoke all on function public.progress_counts() from public, anon, authenticated;
grant execute on function public.progress_counts() to service_role;

-- ---------- 7. CHỨNG NHẬN HOÀN THÀNH KHÓA ----------
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                       -- mã xác minh công khai, vd LBT-7K3Q-9XPM
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  student_name text not null,
  course_title text not null,
  lessons_completed integer not null default 0,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, course_id)
);
alter table public.certificates enable row level security;
drop policy if exists "certificates_select_own" on public.certificates;
create policy "certificates_select_own" on public.certificates for select using (auth.uid() = user_id);
