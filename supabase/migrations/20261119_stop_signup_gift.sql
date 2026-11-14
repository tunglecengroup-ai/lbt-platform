-- =============================================================
-- 15/11/2026: NGỪNG tự tặng khóa "Facebook Ads Từ Cơ Bản Đến Nâng Cao" cho tài khoản MỚI.
-- Học viên đã được tặng trước đây GIỮ NGUYÊN khóa (không thu hồi).
-- Email chào mừng (flow welcome-signup) bỏ câu "tặng sẵn khóa", chuyển sang mời học thử.
-- Chỉ sửa email nếu nội dung còn câu tặng khóa (không đè nội dung anh đã tự sửa trong Admin).
-- Chạy được nhiều lần. Muốn bật lại: chạy lại file 20261110_free_course_on_signup.sql (phần create trigger).
-- =============================================================

drop trigger if exists on_profile_created_grant_course on public.profiles;

update public.automation_steps s
   set subject = 'Tài khoản đã sẵn sàng, bài học thử đang chờ {{ten}}',
       body = $b$<p>Chào {{ten}},</p><p>Tài khoản của anh/chị ở Học viện Lê Bá Tùng đã tạo xong. Các bài học thử của khóa <b>Facebook Ads Chuyên Sâu Từ A-Z</b> đã mở, vào là xem được luôn.</p><p>Buổi đầu anh/chị xem Bài 0 và Bài 1 để nắm cách học, sau đó làm theo từng bài trong Chương 0. Mỗi bài tầm 5 đến 15 phút.</p><p><a href="{{link_hoc}}">Vào học thử</a></p><p>Lần sau đăng nhập bằng mã gửi về email, xong anh/chị đặt mật khẩu để vào nhanh hơn.</p><p>Lê Bá Tùng</p>$b$
  from public.automation_flows f
 where s.flow_id = f.id and f.key = 'welcome-signup' and s.position = 1
   and s.body like '%tặng sẵn khóa%';

update public.automation_steps s
   set body = replace(s.body, 'Cả 3 chỗ này đều có trong khóa cơ bản anh/chị đang được tặng.', 'Cả 3 chỗ này tôi đều nói kỹ trong khóa Facebook Ads Chuyên Sâu, vài bài đầu anh/chị đã học thử được.')
  from public.automation_flows f
 where s.flow_id = f.id and f.key = 'welcome-signup' and s.position = 2
   and s.body like '%đang được tặng%';

-- Kiểm tra: phải ra 0 dòng trigger + 2 email không còn chữ "tặng"
select 'trigger con lai' as kiem_tra, count(*)::text as ket_qua from pg_trigger where tgname = 'on_profile_created_grant_course'
union all
select 'email con chu tang', count(*)::text from public.automation_steps s join public.automation_flows f on f.id = s.flow_id
 where f.key = 'welcome-signup' and (s.body like '%tặng sẵn khóa%' or s.body like '%đang được tặng%');
