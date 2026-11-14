-- Khóa HỌC THỬ trên trang chủ: vài bài mở miễn phí (lessons.is_free_preview), bài còn lại khóa, mua để mở hết.
-- Phải đăng ký tài khoản (họ tên, SĐT, email) mới vào học thử. Chạy được nhiều lần.
alter table public.courses add column if not exists trial_featured boolean not null default false;
alter table public.courses add column if not exists trial_position integer not null default 0;

update public.courses set trial_featured = true, trial_position = 1 where slug = 'facebook-ads-chuyen-sau-tu-a-z';
update public.courses set trial_featured = true, trial_position = 2 where slug = 'ung-dung-ai-trong-quang-cao';

-- Khóa AI: mở bài có video đầu tiên làm bài học thử (anh chỉnh thêm trong Admin -> Khóa học)
update public.lessons l set is_free_preview = true
from public.courses c
where l.course_id = c.id and c.slug = 'ung-dung-ai-trong-quang-cao'
  and l.title like 'Bài 1: Dùng AI tạo content%';
