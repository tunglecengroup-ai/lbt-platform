/** Kiểu dữ liệu bám theo supabase/schema.sql */

export type CourseRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_gradient: string | null;
  cover_url: string | null;
  instructor: string | null;
  price_vnd: number;
  compare_price_vnd: number | null;
  outcomes: string[] | null;
  access_days: number | null;
  gr_campaign_id: string | null;
  is_published: boolean;
  position: number;
};

export type LessonRow = {
  id: string;
  chapter_id: string;
  course_id: string;
  title: string;
  duration_seconds: number;
  position: number;
  is_free_preview: boolean;
};

export type ChapterWithLessons = {
  id: string;
  title: string;
  position: number;
  lessons: LessonRow[];
};

export type CourseOutline = CourseRow & { chapters: ChapterWithLessons[] };

export type OrderRow = {
  id: string;
  code: string;
  user_id: string | null;
  course_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  amount_vnd: number;
  status: "pending" | "paid" | "cancelled" | "refunded";
  payment_method: string | null;
  tx_reference: string | null;
  paid_at: string | null;
  created_at: string;
};

/** Cột bài học an toàn cho anon (không có ID video) */
export const LESSON_PUBLIC_COLUMNS =
  "id, chapter_id, course_id, title, duration_seconds, position, is_free_preview";
