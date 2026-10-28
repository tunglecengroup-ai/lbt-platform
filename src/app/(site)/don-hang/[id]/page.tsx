import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { bankInfo, isBankConfigured, vietQrUrl } from "@/lib/payment";
import { formatVND } from "@/lib/utils";
import type { OrderRow } from "@/lib/types";
import { CopyValue, PaidPanel, PaymentWatcher } from "./order-client";

export const metadata = { title: "Thanh toán đơn hàng — Học viện Lê Bá Tùng", robots: { index: false } };

export default async function OrderPage({ params }: PageProps<"/don-hang/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = createAdminSupabase();
  const { data } = await db.from("orders").select("*, courses(title, slug)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const order = data as OrderRow & { courses: { title: string; slug: string } | null };
  const course = order.courses;

  if (order.status === "paid") {
    return (
      <main className="mx-auto max-w-lg px-4 py-12">
        <PaidPanel email={order.customer_email ?? ""} courseSlug={course?.slug ?? ""} courseTitle={course?.title ?? ""} />
      </main>
    );
  }

  if (order.status !== "pending") {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <h1 className="text-xl font-semibold">Đơn {order.code} đã bị hủy</h1>
        <p className="text-muted-foreground mt-2 text-sm">Vui lòng đăng ký lại hoặc liên hệ hỗ trợ.</p>
      </main>
    );
  }

  const bank = bankInfo();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <h1 className="text-center text-2xl font-semibold">Quét mã QR để thanh toán</h1>
      <p className="text-muted-foreground mt-1 text-center text-sm">
        Bước 2/2 — Khóa học được mở tự động ngay khi tiền về tài khoản.
      </p>

      <Card className="mt-6 grid gap-6 p-6 md:grid-cols-[280px_1fr]">
        <div className="flex flex-col items-center">
          {isBankConfigured() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vietQrUrl(order.amount_vnd, order.code)} alt={`Mã QR thanh toán đơn ${order.code}`} className="w-full max-w-[280px] rounded-lg border bg-white" />
          ) : (
            <div className="text-muted-foreground flex aspect-square w-full items-center justify-center rounded-lg border p-4 text-center text-sm">
              Chưa cấu hình tài khoản ngân hàng (BANK_ID, BANK_ACCOUNT_NO)
            </div>
          )}
          <p className="text-muted-foreground mt-2 text-xs">Mở app ngân hàng → Quét QR</p>
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-medium">{course?.title}</p>
          <dl className="divide-y rounded-lg border">
            <Row label="Ngân hàng" value={bank.bankId} />
            <Row label="Số tài khoản" value={bank.accountNo} copy />
            <Row label="Chủ tài khoản" value={bank.accountName} />
            <Row label="Số tiền" value={formatVND(order.amount_vnd)} copyValue={String(order.amount_vnd)} copy />
            <Row label="Nội dung CK" value={order.code} copy highlight />
          </dl>
          <p className="bg-warning-soft text-warning rounded-md px-3 py-2 text-xs">
            Ghi <b>đúng nội dung {order.code}</b> và đúng số tiền để hệ thống tự kích hoạt.
          </p>
          <PaymentWatcher orderId={order.id} />
        </div>
      </Card>
    </main>
  );
}

function Row({
  label,
  value,
  copy,
  copyValue,
  highlight,
}: {
  label: string;
  value: string;
  copy?: boolean;
  copyValue?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <dt className="text-muted-foreground w-28 shrink-0">{label}</dt>
      <dd className={highlight ? "text-primary flex-1 font-bold" : "flex-1 font-medium"}>{value || "—"}</dd>
      {copy && value && <CopyValue value={copyValue ?? value} />}
    </div>
  );
}
