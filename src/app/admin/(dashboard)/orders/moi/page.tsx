import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent } from "@/components/ui/card";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { CHANNELS } from "@/lib/channels";
import { NewOrderForm } from "./new-order-form";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const db = createAdminSupabase();
  const [{ data: courses }, { data: plans }] = await Promise.all([
    db.from("courses").select("id, title, price_vnd").order("position"),
    db.from("membership_plans").select("id, name, price_vnd").order("position"),
  ]);
  const items = [
    ...(courses ?? []).map((c) => ({ value: `c:${c.id}`, label: c.title, price: c.price_vnd ?? 0 })),
    ...(plans ?? []).map((p) => ({ value: `p:${p.id}`, label: `Gói ${p.name}`, price: p.price_vnd ?? 0 })),
  ];
  const channels = Object.entries(CHANNELS).map(([value, v]) => ({ value, label: v.label }));
  return (
    <>
      <Topbar title="Tạo đơn hàng" subtitle="Khách mua qua inbox, chuyển khoản ngoài, tiền mặt…" />
      <PageBody className="max-w-3xl">
        <MobileHeading title="Tạo đơn hàng" />
        <Link href="/admin/orders" className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="size-4" /> Tất cả đơn hàng
        </Link>
        <Card>
          <CardContent className="pt-6">
            <NewOrderForm items={items} channels={channels} />
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
