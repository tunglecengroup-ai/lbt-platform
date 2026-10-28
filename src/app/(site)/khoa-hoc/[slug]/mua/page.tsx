import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CourseCover } from "@/components/course-cover";
import { getPublishedOutline, outlineStats } from "@/lib/courses";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatVND } from "@/lib/utils";
import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "Đăng ký khóa học — Học viện Lê Bá Tùng", robots: { index: false } };

export default async function CheckoutPage({ params }: PageProps<"/khoa-hoc/[slug]/mua">) {
  const { slug } = await params;
  const course = await getPublishedOutline(slug);
  if (!course) notFound();
  const { total } = outlineStats(course);

  const { data } = await (await createServerSupabase()).auth.getUser();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <Link href={`/khoa-hoc/${slug}`} className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm font-medium">
        <ArrowLeft className="size-4" /> Quay lại khóa học
      </Link>
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <Card className="p-6">
          <h1 className="text-xl font-semibold">Thông tin đăng ký</h1>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">Bước 1/2 — Điền thông tin, bước sau quét mã QR để thanh toán.</p>
          <CheckoutForm
            slug={slug}
            defaultEmail={data.user?.email}
            defaultName={(data.user?.user_metadata?.full_name as string | undefined) || undefined}
          />
        </Card>
        <Card className="h-fit overflow-hidden">
          <CourseCover course={course} className="aspect-video" />
          <div className="p-5">
            <p className="font-semibold">{course.title}</p>
            <p className="text-muted-foreground mt-1 text-sm">{total} bài học</p>
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <span className="text-sm">Tổng thanh toán</span>
              <span className="text-xl font-bold">{course.price_vnd ? formatVND(course.price_vnd) : "Miễn phí"}</span>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
