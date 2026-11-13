import { notFound } from "next/navigation";
import { isAdminSession } from "@/lib/admin-guard";
import { LandingScreen, loadLanding } from "@/components/landing/landing-screen";

// Xem trước bản nháp — chỉ admin, không lưu cache, không đếm lượt xem
export const dynamic = "force-dynamic";
export const metadata = { title: "Xem trước trang bán", robots: { index: false, follow: false } };

export default async function LandingPreviewPage({ params }: PageProps<"/l/xem-truoc/[slug]">) {
  const { slug } = await params;
  if (!(await isAdminSession())) notFound();
  const data = await loadLanding(slug, true);
  if (!data) notFound();
  return <LandingScreen {...data} ctx={{ ...data.ctx, preview: true }} />;
}
