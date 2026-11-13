import "server-only";
import Link from "next/link";
import { getLandingBySlug } from "@/lib/landing";
import { buildOutline } from "@/lib/courses";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { LESSON_PUBLIC_COLUMNS, type CourseRow, type LessonRow, type ReviewRow } from "@/lib/types";
import { LandingView, type LandingCtx } from "@/components/landing/landing-view";
import { LandingTracker } from "@/components/landing/landing-client";
import { BRAND } from "@/lib/site";

/** Đọc trang + khóa/gói. allowDraft = cho xem bản nháp (chỉ route xem trước của admin) */
export async function loadLanding(slug: string, allowDraft = false) {
  const landing = await getLandingBySlug(slug);
  if (!landing) return null;
  const preview = !landing.is_published;
  if (preview && !allowDraft) return null;

  const db = createAdminSupabase();
  let title = landing.name;
  let cover: string | null = null;
  let basePrice = 0;
  let baseCompare: number | null = null;
  let chapters: LandingCtx["chapters"] = [];
  let reviews: ReviewRow[] = [];
  let itemId = landing.id;

  if (landing.plan_id) {
    const { data: plan } = await db.from("membership_plans").select("id, name, price_vnd, compare_price_vnd").eq("id", landing.plan_id).maybeSingle();
    if (plan) ({ name: title, price_vnd: basePrice, compare_price_vnd: baseCompare, id: itemId } = plan);
  } else if (landing.course_id) {
    const [{ data: course }, { data: chs }, { data: ls }, { data: rv }] = await Promise.all([
      db.from("courses").select("*").eq("id", landing.course_id).maybeSingle(),
      db.from("chapters").select("id, title, position").eq("course_id", landing.course_id),
      db.from("lessons").select(LESSON_PUBLIC_COLUMNS).eq("course_id", landing.course_id),
      db.from("reviews").select("*").eq("course_id", landing.course_id).order("position").limit(12),
    ]);
    if (course) {
      const c = course as CourseRow;
      title = c.title;
      cover = c.cover_url;
      basePrice = c.price_vnd;
      baseCompare = c.compare_price_vnd;
      itemId = c.id;
      chapters = buildOutline(c, chs ?? [], (ls ?? []) as LessonRow[]).chapters;
    }
    reviews = (rv ?? []) as ReviewRow[];
  }

  const price = landing.price_vnd ?? basePrice;
  const compare = landing.compare_price_vnd ?? baseCompare;
  const ctx: LandingCtx = {
    landingId: landing.id,
    title,
    cover,
    price,
    compare,
    chapters,
    reviews,
    preview,
    item: { id: itemId, name: title, price, category: landing.plan_id ? "membership" : "course" },
  };
  return { landing, ctx };
}

export function LandingScreen({ landing, ctx }: NonNullable<Awaited<ReturnType<typeof loadLanding>>>) {
  return (
    <div style={{ ["--lp" as string]: landing.theme_color || "#e11d48" }} className="min-h-dvh bg-white text-zinc-900 [color-scheme:light]">
      {ctx.preview && (
        <div className="sticky top-0 z-50 bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-zinc-900">
          {landing.is_published ? "Bản xem trước của admin (luôn mới nhất)" : "Bản xem trước — trang CHƯA xuất bản, khách chưa xem được"}. Lượt xem lúc này không được tính.
        </div>
      )}
      <LandingTracker landingId={landing.id} item={ctx.item} preview={ctx.preview} />
      <main>
        <LandingView blocks={landing.sections} ctx={ctx} />
      </main>
      <footer className="bg-zinc-950 px-4 py-8 text-center text-sm text-zinc-400">
        © {new Date().getFullYear()} {BRAND.name} · <Link href="/" className="underline">hoc.lebatung.com</Link>
      </footer>
      {/* Nút đăng ký nổi trên điện thoại */}
      <a
        href="#dang-ky"
        className="fixed inset-x-3 bottom-3 z-40 flex h-12 items-center justify-center rounded-full bg-[var(--lp)] font-bold text-white shadow-2xl md:hidden"
      >
        ĐĂNG KÝ NGAY
      </a>
    </div>
  );
}
