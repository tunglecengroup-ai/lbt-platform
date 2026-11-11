import Link from "next/link";
import { notFound } from "next/navigation";
import { getLandingBySlug } from "@/lib/landing";
import { buildOutline } from "@/lib/courses";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isAdminSession } from "@/lib/admin-guard";
import { LESSON_PUBLIC_COLUMNS, type CourseRow, type LessonRow, type ReviewRow } from "@/lib/types";
import { LandingView, type LandingCtx } from "@/components/landing/landing-view";
import { LandingTracker } from "@/components/landing/landing-client";
import { BRAND } from "@/lib/site";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const landing = await getLandingBySlug(slug);
  if (!landing) return null;
  const preview = !landing.is_published;
  if (preview && !(await isAdminSession())) return null;

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

export async function generateMetadata({ params }: PageProps<"/l/[slug]">) {
  const { slug } = await params;
  const landing = await getLandingBySlug(slug);
  if (!landing) return {};
  const hero = landing.sections.find((b) => b.type === "hero")?.data;
  const title = landing.seo_title || hero?.headline || landing.name;
  const description = landing.seo_description || hero?.subheadline || undefined;
  return {
    title: `${title} — ${BRAND.name}`,
    description,
    alternates: { canonical: `/l/${landing.slug}` },
    openGraph: { type: "website", title, description, images: landing.og_image ? [landing.og_image] : undefined },
    // Trang chạy quảng cáo: không cần lên Google (tránh trùng nội dung với trang khóa học)
    robots: { index: false, follow: true },
  };
}

export default async function LandingPage({ params }: PageProps<"/l/[slug]">) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { landing, ctx } = data;

  return (
    <div style={{ ["--lp" as string]: landing.theme_color || "#e11d48" }} className="min-h-dvh bg-white text-zinc-900 [color-scheme:light]">
      {ctx.preview && (
        <div className="sticky top-0 z-50 bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-zinc-900">
          Bản xem trước — trang CHƯA xuất bản, khách chưa xem được. Lượt xem lúc này không được tính.
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
