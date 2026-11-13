import { notFound } from "next/navigation";
import { getLandingBySlug } from "@/lib/landing";
import { BRAND } from "@/lib/site";
import { LandingScreen, loadLanding } from "@/components/landing/landing-screen";

// Lưu sẵn trên CDN, tự làm mới tối đa 5 phút/lần; Admin sửa trang thì làm mới ngay (revalidatePath).
// Bản nháp xem ở /l/xem-truoc/<slug> (chỉ admin).
export const revalidate = 300;
export async function generateStaticParams() {
  return [];
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
  const data = await loadLanding(slug);
  if (!data) notFound();
  return <LandingScreen {...data} />;
}
