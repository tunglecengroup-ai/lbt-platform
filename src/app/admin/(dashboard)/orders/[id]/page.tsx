import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, ExternalLink } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Field, inputClass } from "@/components/ui/field";
import { ConfirmButton } from "@/components/confirm-button";
import { SaveButton } from "@/components/save-button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { formatDate, formatVND } from "@/lib/utils";
import { CHANNELS } from "@/lib/channels";
import { channelColor, channelName, methodLabel, statusView } from "@/lib/order-view";
import type { OrderRow } from "@/lib/types";
import { deleteOrder, markOrderPaid, updateOrder } from "../actions";

export const dynamic = "force-dynamic";

type FullOrder = OrderRow & Record<string, string | number | null> & {
  courses: { title: string; slug: string } | null;
  membership_plans: { name: string } | null;
};

const dt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 text-sm">
      <span className="text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="min-w-0 flex-1 break-words">{children || "—"}</span>
    </div>
  );
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminSupabase();
  const { data } = await db.from("orders").select("*, courses(title, slug), membership_plans(name)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const o = data as FullOrder;
  const st = statusView[o.status];
  const item = o.courses?.title ?? o.membership_plans?.name ?? "—";
  const [{ data: landing }, { data: profile }] = await Promise.all([
    o.landing_id ? db.from("landing_pages").select("name, slug").eq("id", o.landing_id as string).maybeSingle() : Promise.resolve({ data: null }),
    o.user_id ? db.from("profiles").select("id").eq("id", o.user_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return (
    <>
      <Topbar title={`Đơn ${o.code}`} subtitle={`${o.customer_name ?? ""} · ${item}`} />
      <PageBody className="max-w-5xl">
        <MobileHeading title={`Đơn ${o.code}`} />
        <Link href="/admin/orders" className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="size-4" /> Tất cả đơn hàng
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {o.code} <Badge tone={st.tone}><Dot /> {st.label}</Badge>
                  </CardTitle>
                  <CardDescription>Tạo {dt(o.created_at)}{o.paid_at ? ` · Thanh toán ${dt(o.paid_at)}` : ""}</CardDescription>
                </div>
                <p className="tabular text-xl font-bold">{formatVND(o.amount_vnd)}</p>
              </CardHeader>
              <CardContent className="divide-y pt-0">
                <Row label="Khách hàng">{o.customer_name}</Row>
                <Row label="Email">{o.customer_email}</Row>
                <Row label="Số điện thoại">{o.customer_phone && <a href={`tel:${o.customer_phone}`} className="text-primary hover:underline">{o.customer_phone}</a>}</Row>
                <Row label="Khóa học / gói">{item}</Row>
                <Row label="Thanh toán">{o.payment_method ? `${methodLabel[o.payment_method] ?? o.payment_method}${o.tx_reference ? ` · ${o.tx_reference}` : ""}` : "Chưa"}</Row>
                <Row label="Tài khoản học">
                  {profile ? <Link href={`/admin/students/${profile.id}`} className="text-primary hover:underline">Xem học viên</Link> : "Chưa có (tạo khi thanh toán)"}
                </Row>
                {o.admin_note && <Row label="Ghi chú">{o.admin_note as string}</Row>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Nguồn đơn</CardTitle></CardHeader>
              <CardContent className="divide-y pt-0">
                <Row label="Kênh (lần chạm cuối)">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="size-2.5 rounded-full" style={{ background: channelColor(o.channel as string) }} /> {channelName(o.channel as string)}
                  </span>
                </Row>
                <Row label="Kênh biết tới web lần đầu">{o.first_channel ? channelName(o.first_channel as string) : null}</Row>
                <Row label="Chiến dịch (utm_campaign)">{o.utm_campaign as string}</Row>
                <Row label="Mẫu QC (utm_content)">{o.utm_content as string}</Row>
                <Row label="utm_source / medium">{[o.utm_source, o.utm_medium].filter(Boolean).join(" / ")}</Row>
                <Row label="Trang bán">
                  {landing ? (
                    <a href={`/l/${landing.slug}`} target="_blank" className="text-primary inline-flex items-center gap-1 hover:underline">{landing.name} <ExternalLink className="size-3" /></a>
                  ) : null}
                </Row>
                <Row label="Trang giới thiệu">{o.referrer as string}</Row>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Sửa đơn</CardTitle>
                  <CardDescription>Đổi thông tin khách, số tiền, nguồn, trạng thái. Muốn đánh dấu ĐÃ THANH TOÁN thì dùng nút Xác nhận để mở khóa cho khách.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form action={updateOrder} className="grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="id" value={o.id} />
                  <Field label="Họ tên"><input name="customer_name" defaultValue={o.customer_name ?? ""} className={inputClass} /></Field>
                  <Field label="Số điện thoại"><input name="customer_phone" defaultValue={o.customer_phone ?? ""} className={inputClass} /></Field>
                  <Field label="Email" className="sm:col-span-2"><input name="customer_email" type="email" defaultValue={o.customer_email ?? ""} className={inputClass} /></Field>
                  <Field label="Số tiền (đ)"><input name="amount" inputMode="numeric" defaultValue={o.amount_vnd} className={inputClass} /></Field>
                  <Field label="Trạng thái">
                    {o.status === "paid" ? (
                      <select name="status" defaultValue="" className={inputClass}>
                        <option value="">Đã thanh toán (giữ nguyên)</option>
                        <option value="refunded">Hoàn tiền</option>
                        <option value="cancelled">Hủy đơn</option>
                      </select>
                    ) : (
                      <select name="status" defaultValue={o.status} className={inputClass}>
                        <option value="pending">Chờ thanh toán</option>
                        <option value="cancelled">Đã hủy</option>
                        <option value="refunded">Hoàn tiền</option>
                      </select>
                    )}
                  </Field>
                  <Field label="Kênh nguồn">
                    <select name="channel" defaultValue={(o.channel as string) ?? ""} className={inputClass}>
                      <option value="">Chưa ghi nguồn</option>
                      {Object.entries(CHANNELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Chiến dịch"><input name="utm_campaign" defaultValue={(o.utm_campaign as string) ?? ""} className={inputClass} /></Field>
                  <Field label="Mẫu quảng cáo / nội dung" className="sm:col-span-2"><input name="utm_content" defaultValue={(o.utm_content as string) ?? ""} className={inputClass} /></Field>
                  <Field label="Ghi chú" className="sm:col-span-2"><textarea name="admin_note" rows={2} defaultValue={(o.admin_note as string) ?? ""} className={`${inputClass} h-auto py-2`} /></Field>
                  <div className="sm:col-span-2"><SaveButton>Lưu đơn</SaveButton></div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {o.status === "pending" && (
              <Card>
                <CardHeader><CardTitle>Xác nhận thanh toán</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3 text-sm">Khách đã chuyển khoản / trả tiền mặt nhưng hệ thống chưa tự nhận? Bấm để mở khóa {item} cho {o.customer_email}.</p>
                  <form action={markOrderPaid}>
                    <input type="hidden" name="id" value={o.id} />
                    <ConfirmButton className="w-full" message={`Xác nhận đã nhận ${formatVND(o.amount_vnd)} cho đơn ${o.code}? Khóa học sẽ được mở cho ${o.customer_email}.`}>Xác nhận đã thanh toán</ConfirmButton>
                  </form>
                </CardContent>
              </Card>
            )}
            <Card className="border-danger/40">
              <CardHeader>
                <div>
                  <CardTitle className="text-danger">Xóa đơn</CardTitle>
                  <CardDescription>Xóa hẳn đơn khỏi hệ thống, không hoàn tác được. Khóa học đã mở cho khách KHÔNG bị thu hồi (khóa quyền ở trang Học viên nếu cần).</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form action={deleteOrder}>
                  <input type="hidden" name="id" value={o.id} />
                  <ConfirmButton variant="outline" className="text-danger w-full" message={`XÓA VĨNH VIỄN đơn ${o.code} (${formatVND(o.amount_vnd)}, ${o.customer_email})? Không hoàn tác được.`}>
                    <Trash2 className="size-4" /> Xóa đơn này
                  </ConfirmButton>
                </form>
              </CardContent>
            </Card>
            <p className="text-muted-foreground text-xs">Mã đơn nội bộ: {o.id} · tạo ngày {formatDate(o.created_at)}</p>
          </div>
        </div>
      </PageBody>
    </>
  );
}
