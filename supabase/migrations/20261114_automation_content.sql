-- Nội dung chuỗi email chăm sóc (14/11/2026): cập nhật cách đăng nhập mới (mật khẩu / mã lần đầu),
-- khóa tặng khi đăng ký, giọng Lê Bá Tùng, tuân 6 điều cấm (không cam kết kết quả, không "100%/chắc chắn"…).
-- Chỉ SỬA NỘI DUNG + thêm 1 bước; KHÔNG bật flow nào (anh tự bật trong Admin -> Automation).
-- Chạy được nhiều lần.

create or replace function pg_temp.set_step(p_flow text, p_pos int, p_delay int, p_tx boolean, p_subject text, p_body text)
returns void language plpgsql as $$
declare v_flow uuid;
begin
  select id into v_flow from public.automation_flows where key = p_flow;
  if v_flow is null then return; end if;
  if exists (select 1 from public.automation_steps where flow_id = v_flow and position = p_pos) then
    update public.automation_steps
       set delay_minutes = p_delay, transactional = p_tx, subject = p_subject, body = p_body, channel = 'email'
     where flow_id = v_flow and position = p_pos;
  else
    insert into public.automation_steps (flow_id, position, delay_minutes, channel, subject, body, transactional, is_active)
    values (v_flow, p_pos, p_delay, 'email', p_subject, p_body, p_tx, true);
  end if;
end $$;

-- 1. Chào mừng tài khoản mới (dừng khi khách mua khóa)
select pg_temp.set_step('welcome-signup', 1, 5, false,
 'Tài khoản đã sẵn sàng, khóa Facebook Ads cơ bản đã mở cho {{ten}}',
 $b$<p>Chào {{ten}},</p><p>Tài khoản của anh/chị ở Học viện Lê Bá Tùng đã tạo xong. Tôi tặng sẵn khóa <b>Facebook Ads Từ Cơ Bản Đến Nâng Cao</b> trong 12 tháng, vào là học được luôn.</p><p>Buổi đầu anh/chị xem 3 bài đầu của Chương 1: các cấp độ chạy quảng cáo và mấy thuật ngữ dân chạy ads hay dùng. Mỗi bài tầm 10 đến 15 phút.</p><p><a href="{{link_hoc}}">Vào học ngay</a></p><p>Lần đầu đăng nhập bằng mã gửi về email, xong anh/chị đặt mật khẩu để lần sau vào nhanh hơn.</p><p>Lê Bá Tùng</p>$b$);

select pg_temp.set_step('welcome-signup', 2, 2880, false,
 '3 lỗi làm quảng cáo tốn tiền mà ít đơn',
 $b$<p>Chào {{ten}},</p><p>Làm việc với nhiều anh em mới chạy ads, tôi thấy tiền hay mất vào 3 chỗ:</p><ul><li><b>Nhắm đối tượng quá rộng</b> khi tài khoản chưa có dữ liệu, ngân sách bị rải mỏng.</li><li><b>Nội dung nói về sản phẩm</b> thay vì nói về vấn đề khách đang gặp.</li><li><b>Tắt quảng cáo quá sớm</b>, chưa đủ dữ liệu đã kết luận là không ăn.</li></ul><p>Cả 3 chỗ này đều có trong khóa cơ bản anh/chị đang được tặng. Muốn đi sâu hơn về chuyển đổi, xây tài khoản quảng cáo khỏe thì xem thêm các khóa nâng cao.</p><p><a href="{{link_khoa_hoc}}">Xem các khóa học</a></p><p>Lê Bá Tùng</p>$b$);

select pg_temp.set_step('welcome-signup', 3, 4320, false,
 '{{ten}} muốn học trọn bộ thì xem gói này',
 $b$<p>Chào {{ten}},</p><p>Nếu anh/chị muốn học bài bản từ quảng cáo cơ bản tới chuyển đổi, YouTube và ứng dụng AI, gói <b>LBT Member</b> mở các khóa trong gói suốt 12 tháng, kèm bộ công cụ AI: viết content, chấm điểm quảng cáo, chấm điểm fanpage.</p><p>Anh/chị cứ xem kỹ nội dung từng khóa trước, phù hợp thì hãy đăng ký.</p><p><a href="{{link_thanh_vien}}">Xem gói LBT Member</a></p><p>Còn băn khoăn gì cứ trả lời email này, tôi đọc hết.</p><p>Lê Bá Tùng</p>$b$);

-- 2. Hướng dẫn học viên mới (khi được mở khóa)
select pg_temp.set_step('onboarding-enrolled', 1, 0, true,
 'Đã mở khóa {{khoa_hoc}}: cách vào học',
 $b$<p>Chào {{ten}},</p><p>Khóa <b>{{khoa_hoc}}</b> đã mở cho tài khoản {{email}}.</p><p><b>Cách vào học:</b></p><ul><li>Bấm nút bên dưới, nhập đúng email này.</li><li>Lần đầu: chọn "Đăng nhập bằng mã qua email", nhập mã gửi về hộp thư, rồi đặt mật khẩu.</li><li>Những lần sau: đăng nhập bằng email và mật khẩu đã đặt.</li></ul><p><a href="{{link_hoc}}">Vào học ngay</a></p><p>Không thấy mã thì xem thêm mục Spam hoặc Quảng cáo trong hộp thư. Cần hỗ trợ cứ trả lời email này hoặc nhắn Zalo 0869 126 363.</p><p>Chúc anh/chị học tốt.</p>$b$);

select pg_temp.set_step('onboarding-enrolled', 2, 4320, false,
 'Bài đầu tiên của {{khoa_hoc}} chỉ mất 15 phút',
 $b$<p>Chào {{ten}},</p><p>Học online dễ bị để đó lắm. Mẹo của tôi: đừng đợi rảnh cả buổi, chỉ cần 15 phút xem xong 1 bài rồi làm theo luôn trên tài khoản của mình.</p><p><a href="{{link_hoc}}">Học bài tiếp theo</a></p><p>Lê Bá Tùng</p>$b$);

select pg_temp.set_step('onboarding-enrolled', 3, 5760, false,
 '{{ten}} học tới đâu rồi?',
 $b$<p>Chào {{ten}},</p><p>Đã gần 1 tuần từ lúc anh/chị vào khóa <b>{{khoa_hoc}}</b>. Có bài nào xem rồi mà làm theo chưa ra, hay chỗ nào chưa rõ, anh/chị trả lời thẳng email này kèm ảnh chụp màn hình, tôi xem và trả lời.</p><p><a href="{{link_hoc}}">Quay lại khóa học</a></p><p>Lê Bá Tùng</p>$b$);

-- 3. Nhắc đơn chưa thanh toán (dừng khi đơn được trả)
select pg_temp.set_step('abandoned-checkout', 1, 60, true,
 'Đơn {{ma_don}} đang chờ thanh toán',
 $b$<p>Chào {{ten}},</p><p>Đơn <b>{{ma_don}}</b> ({{khoa_hoc}}, {{so_tien}}) đang chờ chuyển khoản. Mã QR thanh toán vẫn dùng được.</p><p><a href="{{link_don_hang}}">Mở trang thanh toán</a></p><p>Chuyển khoản đúng nội dung trên trang là hệ thống tự mở khóa, thường chỉ vài giây.</p>$b$);

select pg_temp.set_step('abandoned-checkout', 2, 1380, false,
 'Còn vướng gì khi đăng ký {{khoa_hoc}}?',
 $b$<p>Chào {{ten}},</p><p>Tôi thấy đơn {{khoa_hoc}} của anh/chị chưa hoàn tất. Nếu còn câu hỏi về nội dung khóa, cách học hay cách thanh toán, anh/chị trả lời email này hoặc nhắn Zalo 0869 126 363, đội ngũ hỗ trợ ngay.</p><p><a href="{{link_don_hang}}">Thanh toán đơn hàng</a></p><p>Lê Bá Tùng</p>$b$);

-- 4. Xác nhận thanh toán
select pg_temp.set_step('order-paid', 1, 0, true,
 'Đã nhận thanh toán đơn {{ma_don}}',
 $b$<p>Chào {{ten}},</p><p>Học viện đã nhận {{so_tien}} cho đơn <b>{{ma_don}}</b> ({{khoa_hoc}}). Quyền học đã mở cho email {{email}}.</p><p><a href="{{link_hoc}}">Vào học ngay</a></p><p>Lần đầu đăng nhập: chọn "Đăng nhập bằng mã qua email", nhập mã rồi đặt mật khẩu cho lần sau.</p><p>Cảm ơn anh/chị đã tin tưởng.</p>$b$);

-- 5. Nhắc học khi 7 ngày không vào (dừng khi học lại)
select pg_temp.set_step('reengage-inactive', 1, 0, false,
 '{{ten}} ơi, bài học đang dở vẫn chờ',
 $b$<p>Chào {{ten}},</p><p>Đã 7 ngày anh/chị chưa vào học. Chạy quảng cáo là việc tay nghề, đều đặn mỗi ngày một bài nhỏ sẽ thấm hơn học dồn.</p><p><a href="{{link_hoc}}">Học tiếp bài đang dở</a></p><p>Lê Bá Tùng</p>$b$);

select pg_temp.set_step('reengage-inactive', 2, 7200, false,
 'Một cách để học hết khóa',
 $b$<p>Chào {{ten}},</p><p>Cách tôi hay khuyên anh em: chọn một khung giờ cố định, ví dụ 20 phút sau bữa tối, học 1 bài và làm thử ngay trên tài khoản quảng cáo của mình. Làm tới đâu chắc tới đó.</p><p><a href="{{link_hoc}}">Quay lại khóa học</a></p><p>Lê Bá Tùng</p>$b$);

-- 6. Sắp hết hạn
select pg_temp.set_step('expiring-soon', 1, 0, false,
 'Khóa {{khoa_hoc}} còn 7 ngày nữa hết hạn',
 $b$<p>Chào {{ten}},</p><p>Quyền học <b>{{khoa_hoc}}</b> của anh/chị sẽ hết hạn ngày {{ngay_het_han}}. Còn bài nào chưa xem thì tranh thủ tuần này nhé.</p><p>Muốn học tiếp các khóa trong 12 tháng tới, anh/chị xem gói LBT Member.</p><p><a href="{{link_thanh_vien}}">Xem gói LBT Member</a></p><p>Lê Bá Tùng</p>$b$);

-- 7. Hoàn thành khóa
select pg_temp.set_step('course-completed', 1, 0, false,
 'Chúc mừng {{ten}} đã học xong {{khoa_hoc}}',
 $b$<p>Chào {{ten}},</p><p>Chúc mừng anh/chị đã học hết <b>{{khoa_hoc}}</b>. Chứng nhận hoàn thành có mã xác minh đã sẵn sàng, in ra, lưu PDF hay chia sẻ đều được.</p><p><a href="{{link_chung_nhan}}">Nhận chứng nhận</a></p><p>Anh/chị có thể trả lời email này vài dòng cảm nhận: phần nào áp dụng được, phần nào cần làm rõ thêm. Góp ý của học viên giúp tôi làm khóa sau tốt hơn.</p><p>Lê Bá Tùng</p>$b$);

-- 8. Chào mừng thành viên
select pg_temp.set_step('member-welcome', 1, 0, true,
 'Chào mừng thành viên {{goi_thanh_vien}}',
 $b$<p>Chào {{ten}},</p><p>Gói <b>{{goi_thanh_vien}}</b> đã kích hoạt tới ngày {{ngay_het_han}}. Các khóa trong gói và bộ công cụ AI đã mở trong khu học tập.</p><p><a href="{{link_hoc}}">Vào khu học tập</a></p><p>Lần đầu đăng nhập: chọn "Đăng nhập bằng mã qua email", nhập mã rồi đặt mật khẩu cho lần sau.</p><p>Lê Bá Tùng</p>$b$);
