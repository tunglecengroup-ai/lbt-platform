/**
 * Dữ liệu mẫu cho KHU HỌC VIÊN (LMS).
 * Cấu trúc bám đúng schema Supabase có sẵn (courses > chapters > lessons,
 * enrollments, progress) trong D:\Git\academy\supabase\schema.sql.
 * Khi nối Supabase thật: thay các hàm getMyCourses / getCourse / findLesson
 * bằng query, giữ nguyên kiểu dữ liệu.
 */

export type Resource = { label: string; href: string };

export type Lesson = {
  id: string;
  title: string;
  durationSec: number;
  youtubeId?: string; // YouTube unlisted khi nối thật
  isFreePreview: boolean;
  completed: boolean;
  resources?: Resource[];
};

export type Chapter = {
  id: string;
  title: string;
  lessons: Lesson[];
};

export type EnrolledCourse = {
  slug: string;
  title: string;
  subtitle: string;
  cover: string; // gradient class
  instructor: string;
  chapters: Chapter[];
};

export const currentStudent = {
  name: "Nguyễn Hải Đăng",
  email: "dangnh.store@gmail.com",
};

export const myCourses: EnrolledCourse[] = [
  {
    slug: "fb-ads-cam-tay",
    title: "FB Ads cầm tay chỉ việc",
    subtitle: "Từ số 0 đến chạy quảng cáo ra đơn đều tay",
    cover: "from-blue-500 to-indigo-600",
    instructor: "Lê Bá Tùng",
    chapters: [
      {
        id: "c1",
        title: "Chương 1 — Nhập môn & tư duy",
        lessons: [
          { id: "l1", title: "Chào mừng & lộ trình khóa học", durationSec: 412, isFreePreview: true, completed: true },
          { id: "l2", title: "Tư duy đúng về quảng cáo Facebook", durationSec: 934, isFreePreview: true, completed: true },
          { id: "l3", title: "Hiểu về hệ sinh thái Meta Business", durationSec: 1120, isFreePreview: false, completed: true },
        ],
      },
      {
        id: "c2",
        title: "Chương 2 — Cài đặt nền tảng & Pixel",
        lessons: [
          { id: "l4", title: "Tạo Business Manager chuẩn chống khóa", durationSec: 1345, isFreePreview: false, completed: true, resources: [{ label: "Checklist cài đặt BM (PDF)", href: "#" }] },
          { id: "l5", title: "Cài Pixel & Conversion API", durationSec: 1580, isFreePreview: false, completed: true, resources: [{ label: "File hướng dẫn gắn Pixel (Drive)", href: "#" }] },
          { id: "l6", title: "Tạo tài khoản quảng cáo & thẻ thanh toán", durationSec: 872, isFreePreview: false, completed: false },
        ],
      },
      {
        id: "c3",
        title: "Chương 3 — Lên chiến dịch đầu tiên",
        lessons: [
          { id: "l7", title: "Cấu trúc chiến dịch 1-3-1 kinh điển", durationSec: 1640, isFreePreview: false, completed: false },
          { id: "l8", title: "Target đúng tệp khách hàng", durationSec: 1892, isFreePreview: false, completed: false },
          { id: "l9", title: "Viết content & làm creative đúng chuẩn", durationSec: 1455, isFreePreview: false, completed: false },
          { id: "l10", title: "Bấm nút xuất bản & đọc chỉ số ngày đầu", durationSec: 1077, isFreePreview: false, completed: false },
        ],
      },
      {
        id: "c4",
        title: "Chương 4 — Tối ưu & Scale",
        lessons: [
          { id: "l11", title: "Đọc báo cáo: chỉ số nào thật sự quan trọng", durationSec: 1320, isFreePreview: false, completed: false },
          { id: "l12", title: "Khi nào tắt, khi nào giữ, khi nào scale", durationSec: 1710, isFreePreview: false, completed: false },
          { id: "l13", title: "Nhân bản chiến dịch win theo tỉnh", durationSec: 1188, isFreePreview: false, completed: false },
        ],
      },
    ],
  },
  {
    slug: "combo-ads-pro",
    title: "Combo Ads Pro — Scale 100tr/tháng",
    subtitle: "Dành cho người đã chạy ads, muốn bứt phá ngân sách lớn",
    cover: "from-violet-500 to-fuchsia-600",
    instructor: "Lê Bá Tùng",
    chapters: [
      {
        id: "pc1",
        title: "Chương 1 — Nền tảng scale",
        lessons: [
          { id: "p1", title: "Tư duy scale không vỡ tài khoản", durationSec: 1240, isFreePreview: true, completed: true },
          { id: "p2", title: "Cấu trúc CBO cho ngân sách lớn", durationSec: 1670, isFreePreview: false, completed: false },
          { id: "p3", title: "Quản trị nhiều tài khoản quảng cáo", durationSec: 1410, isFreePreview: false, completed: false },
        ],
      },
      {
        id: "pc2",
        title: "Chương 2 — Vận hành đội nhóm",
        lessons: [
          { id: "p4", title: "Phân bổ ngân sách theo ROAS thật", durationSec: 1530, isFreePreview: false, completed: false },
          { id: "p5", title: "Báo cáo & ra quyết định hằng ngày", durationSec: 1290, isFreePreview: false, completed: false },
        ],
      },
    ],
  },
];

// ---------- Helpers (thay bằng query Supabase khi nối thật) ----------

export function courseStats(course: EnrolledCourse) {
  const lessons = course.chapters.flatMap((c) => c.lessons);
  const total = lessons.length;
  const done = lessons.filter((l) => l.completed).length;
  const totalSec = lessons.reduce((s, l) => s + l.durationSec, 0);
  const progress = total ? Math.round((done / total) * 100) : 0;
  return { total, done, totalSec, progress };
}

/** Danh sách bài phẳng theo thứ tự học, kèm tên chương */
export function flatLessons(course: EnrolledCourse) {
  return course.chapters.flatMap((ch) =>
    ch.lessons.map((lesson) => ({ lesson, chapterTitle: ch.title, chapterId: ch.id })),
  );
}

export function getCourse(slug: string) {
  return myCourses.find((c) => c.slug === slug) ?? null;
}

export function findLesson(course: EnrolledCourse, lessonId: string) {
  const flat = flatLessons(course);
  const idx = flat.findIndex((x) => x.lesson.id === lessonId);
  if (idx === -1) return null;
  return {
    ...flat[idx],
    index: idx,
    prev: idx > 0 ? flat[idx - 1].lesson : null,
    next: idx < flat.length - 1 ? flat[idx + 1].lesson : null,
    total: flat.length,
  };
}

/** Bài học tiếp theo chưa hoàn thành — để nút "Tiếp tục học" */
export function resumeLesson(course: EnrolledCourse) {
  const flat = flatLessons(course);
  return (flat.find((x) => !x.lesson.completed) ?? flat[0]).lesson;
}
