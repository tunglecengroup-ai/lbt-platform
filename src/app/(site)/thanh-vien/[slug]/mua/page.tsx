import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Crown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getPlanBySlug } from "@/lib/membership";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatVND } from "@/lib/utils";
import { CheckoutForm } from "../../../khoa-hoc/[slug]/mua/checkout-form";
import { TrackEvent } from "@/components/track-event";

export const metadata = { title: "Đăng ký thành viên — Học viện Lê Bá Tùng", robots: { index: false } };

export default async function PlanCheckoutPage({ params }: PageProps<"/thanh-vien/[slug]/mua">) {
  const { slug } = await params;
  const plan = await getPlanBySlug(slug);
  if (!plan) notFound();
  const { data } = await (await createServerSupabase()).auth.getUser();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <TrackEvent event="begin_checkout" item={{ id: plan.id, name: plan.name, price: plan.price_vnd, category: "membership" }} />
      <Link href="/thanh-vien" className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm font-medium">
        <ArrowLeft className="size-4" /> Quay lại gói thành viên
      </Link>
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <Card className="p-6">
          <h1 className="text-xl font-semibold">Thông tin đăng ký</h1>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">Bước 1/2 — Điền thông tin, bước sau quét mã QR để thanh toán.</p>
          <CheckoutForm
            slug={plan.slug}
            kind="plan"
            defaultEmail={data.user?.email}
            defaultName={(data.user?.user_metadata?.full_name as string | undefined) || undefined}
          />
        </Card>
        <Card className="h-fit p-5">
          <p className="flex items-center gap-2 font-semibold"><Crown className="text-warning size-4" /> {plan.name}</p>
          <p className="text-muted-foreground mt-1 text-sm">{plan.duration_days >= 365 ? "12 tháng" : `${plan.duration_days} ngày`}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {plan.perks.map((perk) => (
              <li key={perk} className="flex gap-2"><Check className="text-success mt-0.5 size-4 shrink-0" /> {perk}</li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <span className="text-sm">Tổng thanh toán</span>
            <span className="text-xl font-bold">{plan.price_vnd ? formatVND(plan.price_vnd) : "Miễn phí"}</span>
          </div>
        </Card>
      </div>
    </main>
  );
}
