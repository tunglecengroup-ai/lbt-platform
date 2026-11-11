import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowLeft, Copy, ExternalLink, Trash2 } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { Field, inputClass } from "@/components/ui/field";
import { ConfirmButton } from "@/components/confirm-button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { emptyStats, getLandingById, landingStats, type FunnelStats } from "@/lib/landing";
import { BLOCKS, type Block } from "@/lib/landing-blocks";
import { siteUrl } from "@/lib/site";
import { formatVND, timeAgo } from "@/lib/utils";
import {
  addBlock, deleteBlock, deleteLanding, duplicateBlock, duplicateLanding, moveBlock, saveBlock, saveLandingSettings, togglePublish,
} from "../actions";
import { FunnelCells, FunnelHead, RangeTabs, sinceOf } from "../shared";
import { AiWriteForm, CopyField } from "./editor-client";

export const dynamic = "force-dynamic";

function BlockEditor({ landingId, block, index, count }: { landingId: string; block: Block; index: number; count: number }) {
  const def = BLOCKS[block.type];
  const hidden = (
    <>
      <input type="hidden" name="id" value={landingId} />
      <input type="hidden" name="block_id" value={block.id} />
    </>
  );
  const summary = block.data.title || block.data.headline || "";
  return (
    <Card id={`b-${block.id}`} className="overflow-hidden">
      <div className="bg-muted/40 flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded text-xs font-bold">{index + 1}</span>
        <span className="font-semibold">{def.label}</span>
        {summary && <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">— {summary}</span>}
        <div className="ml-auto flex gap-1">
          <form action={moveBlock}>{hidden}<input type="hidden" name="dir" value="up" />
            <Button variant="ghost" size="sm" disabled={index === 0} aria-label="Lên"><ArrowUp className="size-4" /></Button>
          </form>
          <form action={moveBlock}>{hidden}<input type="hidden" name="dir" value="down" />
            <Button variant="ghost" size="sm" disabled={index === count - 1} aria-label="Xuống"><ArrowDown className="size-4" /></Button>
          </form>
          <form action={duplicateBlock}>{hidden}
            <Button variant="ghost" size="sm" aria-label="Nhân bản khối"><Copy className="size-4" /></Button>
          </form>
          <form action={deleteBlock}>{hidden}
            <ConfirmButton variant="ghost" size="sm" message={`Xóa khối "${def.label}"?`} aria-label="Xóa khối"><Trash2 className="size-4" /></ConfirmButton>
          </form>
        </div>
      </div>
      <details className="group">
        <summary className="text-primary cursor-pointer px-4 py-2.5 text-sm font-medium">Sửa nội dung</summary>
        <form action={saveBlock} className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
          {hidden}
          {def.fields.map((f) => {
            const v = block.data[f.key] ?? "";
            const wide = f.kind === "textarea" || f.kind === "lines" || f.key === "headline";
            return (
              <Field key={f.key} label={f.label} hint={f.hint} className={wide ? "sm:col-span-2" : undefined}>
                {f.kind === "textarea" || f.kind === "lines" ? (
                  <textarea name={f.key} defaultValue={v} rows={f.kind === "lines" ? 6 : 3} className={`${inputClass} h-auto py-2`} />
                ) : (
                  <input
                    name={f.key}
                    defaultValue={v}
                    type={f.kind === "datetime" ? "datetime-local" : f.kind === "url" ? "url" : "text"}
                    className={inputClass}
                  />
                )}
              </Field>
            );
          })}
          {block.type === "curriculum" && <p className="text-muted-foreground text-sm sm:col-span-2">Mục lục tự lấy từ chương/bài của khóa — sửa ở Admin → Khóa học.</p>}
          {block.type === "checkout" && <p className="text-muted-foreground text-sm sm:col-span-2">Form gồm Họ tên, SĐT, Email. Đơn tạo ra tự gắn trang này + UTM quảng cáo.</p>}
          <div className="sm:col-span-2"><Button type="submit" size="sm">Lưu khối</Button></div>
        </form>
      </details>
    </Card>
  );
}

function BreakdownTable({ title, hint, data }: { title: string; hint: string; data: Map<string, FunnelStats> }) {
  const rows = [...data].sort((a, b) => b[1].revenue - a[1].revenue || b[1].orders - a[1].orders || b[1].visitors - a[1].visitors);
  return (
    <Card className="overflow-hidden">
      <CardHeader><div><CardTitle>{title}</CardTitle><CardDescription>{hint}</CardDescription></div></CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <FunnelHead first={title} />
          <tbody className="divide-y">
            {rows.length === 0 && <tr><td colSpan={9} className="text-muted-foreground px-3 py-6 text-center">Chưa có số liệu</td></tr>}
            {rows.slice(0, 50).map(([k, s]) => (
              <tr key={k}><td className="max-w-72 truncate px-3 py-2.5 font-medium" title={k}>{k}</td><FunnelCells s={s} /></tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default async function LandingEditorPage({ params, searchParams }: PageProps<"/admin/landing/[id]">) {
  const { id } = await params;
  const range = String((await searchParams).range ?? "30");
  const landing = await getLandingById(id);
  if (!landing) notFound();
  const db = createAdminSupabase();
  const [stats, { data: courses }, { data: plans }] = await Promise.all([
    landingStats({ since: sinceOf(range), landingId: id }),
    db.from("courses").select("id, title, price_vnd").order("position"),
    db.from("membership_plans").select("id, name, price_vnd").order("position"),
  ]);
  const target = landing.plan_id ? `plan:${landing.plan_id}` : landing.course_id ? `course:${landing.course_id}` : "";
  const basePrice = landing.plan_id
    ? plans?.find((p) => p.id === landing.plan_id)?.price_vnd
    : courses?.find((c) => c.id === landing.course_id)?.price_vnd;
  const url = `${siteUrl}/l/${landing.slug}`;
  const adsUrl = `${url}?utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}`;
  const now = new Date();

  return (
    <>
      <Topbar title={landing.name} subtitle={`Trang bán · /l/${landing.slug}`} />
      <PageBody>
        <MobileHeading title={landing.name} />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link href="/admin/landing" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"><ArrowLeft className="size-4" /> Tất cả trang</Link>
          {landing.is_published ? <Badge tone="success"><Dot /> Đang chạy</Badge> : <Badge tone="neutral"><Dot /> Nháp</Badge>}
          <div className="ml-auto flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><a href={`/l/${landing.slug}`} target="_blank">{landing.is_published ? "Xem trang" : "Xem trước"} <ExternalLink className="size-3.5" /></a></Button>
            <form action={togglePublish}><input type="hidden" name="id" value={id} />
              <Button size="sm" variant={landing.is_published ? "outline" : "primary"}>{landing.is_published ? "Tắt trang" : "Xuất bản"}</Button>
            </form>
            <form action={duplicateLanding}><input type="hidden" name="id" value={id} /><Button size="sm" variant="outline">Nhân bản trang (test A/B)</Button></form>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          {/* Cột trái: các khối */}
          <div className="min-w-0 space-y-3">
            {landing.sections.map((b, i) => (
              <BlockEditor key={b.id} landingId={id} block={b} index={i} count={landing.sections.length} />
            ))}
            <Card className="p-4">
              <form action={addBlock} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={id} />
                <Field label="Thêm khối" className="min-w-56 flex-1">
                  <select name="type" className={inputClass}>
                    {Object.entries(BLOCKS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </Field>
                <Button type="submit">Thêm</Button>
              </form>
            </Card>
          </div>

          {/* Cột phải: cài đặt + link quảng cáo + AI */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Link chạy quảng cáo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <CopyField label="Link trang" value={url} />
                <CopyField label="Link dán vào quảng cáo Facebook (tự điền tên camp/nhóm/ad)" value={adsUrl} />
                <p className="text-muted-foreground text-xs">
                  Dán link thứ 2 vào ô &quot;Trang web&quot; của quảng cáo. Facebook tự thay {"{{campaign.name}}"}… bằng tên thật → bảng bên dưới tách được đơn & doanh thu theo từng camp, từng mẫu quảng cáo.
                  Kênh khác: đổi utm_source (zalo, youtube, email…).
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><div><CardTitle>AI viết nội dung</CardTitle><CardDescription>Viết lại chữ các khối từ thông tin khóa học</CardDescription></div></CardHeader>
              <CardContent><AiWriteForm id={id} /></CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Cài đặt trang</CardTitle></CardHeader>
              <CardContent>
                <form action={saveLandingSettings} className="space-y-4">
                  <input type="hidden" name="id" value={id} />
                  <Field label="Tên trang (nội bộ)"><input name="name" defaultValue={landing.name} className={inputClass} /></Field>
                  <Field label="Đường dẫn" hint="Đổi đường dẫn = link quảng cáo cũ sẽ hỏng"><input name="slug" defaultValue={landing.slug} className={inputClass} /></Field>
                  <Field label="Bán khóa / gói">
                    <select name="target" defaultValue={target} className={inputClass}>
                      <option value="">— Chưa chọn —</option>
                      <optgroup label="Khóa học">{(courses ?? []).map((c) => <option key={c.id} value={`course:${c.id}`}>{c.title}</option>)}</optgroup>
                      {(plans ?? []).length > 0 && <optgroup label="Gói thành viên">{(plans ?? []).map((p) => <option key={p.id} value={`plan:${p.id}`}>{p.name}</option>)}</optgroup>}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Giá bán riêng (đ)" hint={basePrice != null ? `Trống = giá gốc ${formatVND(basePrice)}` : "Trống = giá khóa"}>
                      <input name="price" inputMode="numeric" defaultValue={landing.price_vnd ?? ""} className={inputClass} />
                    </Field>
                    <Field label="Giá gạch (đ)"><input name="compare_price" inputMode="numeric" defaultValue={landing.compare_price_vnd ?? ""} className={inputClass} /></Field>
                  </div>
                  <Field label="Màu chủ đạo"><input name="theme_color" type="color" defaultValue={landing.theme_color} className="h-10 w-20 cursor-pointer rounded border" /></Field>
                  <Field label="Tiêu đề khi chia sẻ (SEO)"><input name="seo_title" defaultValue={landing.seo_title ?? ""} className={inputClass} /></Field>
                  <Field label="Mô tả khi chia sẻ"><textarea name="seo_description" rows={2} defaultValue={landing.seo_description ?? ""} className={`${inputClass} h-auto py-2`} /></Field>
                  <Field label="Ảnh khi chia sẻ (link)"><input name="og_image" type="url" defaultValue={landing.og_image ?? ""} className={inputClass} /></Field>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={landing.is_published} className="size-4" /> Xuất bản (khách xem được)</label>
                  <Button type="submit">Lưu cài đặt</Button>
                </form>
                <form action={deleteLanding} className="mt-6 border-t pt-4">
                  <input type="hidden" name="id" value={id} />
                  <ConfirmButton variant="ghost" size="sm" className="text-danger" message="Xóa hẳn trang này? Số liệu lượt xem bị xóa theo (đơn hàng vẫn giữ). Không hoàn tác được.">
                    <Trash2 className="size-4" /> Xóa trang
                  </ConfirmButton>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Số liệu */}
        <div className="mt-10 mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Số liệu trang này</h2>
          <RangeTabs current={range} base={`/admin/landing/${id}`} />
        </div>
        <Card className="mb-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <FunnelHead first="Tổng" />
              <tbody><tr><td className="px-3 py-2.5 font-medium">Cả trang</td><FunnelCells s={stats.byLanding.get(id) ?? emptyStats()} /></tr></tbody>
            </table>
          </div>
        </Card>
        <div className="space-y-6">
          <BreakdownTable title="Chiến dịch" hint="Theo utm_campaign — tên camp Facebook" data={stats.byCampaign} />
          <BreakdownTable title="Mẫu quảng cáo" hint="Theo utm_content — tên ad (creative nào ra đơn)" data={stats.byContent} />
          <BreakdownTable title="Nguồn" hint="Theo utm_source — facebook / zalo / youtube / email…" data={stats.bySource} />
          <Card className="overflow-hidden">
            <CardHeader><div><CardTitle>Đơn gần đây từ trang này</CardTitle><CardDescription>Xử lý đơn ở Admin → Đơn hàng</CardDescription></div></CardHeader>
            <ul className="divide-y text-sm">
              {stats.orders.length === 0 && <li className="text-muted-foreground px-5 py-6 text-center">Chưa có đơn</li>}
              {stats.orders.slice(0, 30).map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                  <span className="font-mono text-xs">{o.code}</span>
                  <span className="min-w-0 flex-1 truncate">{o.customer_name} · {o.customer_phone}</span>
                  <span className="text-muted-foreground max-w-60 truncate text-xs" title={o.utm_content ?? ""}>{o.utm_campaign || o.utm_source || "không UTM"}{o.utm_content ? ` / ${o.utm_content}` : ""}</span>
                  <span className="tabular font-semibold">{formatVND(o.amount_vnd)}</span>
                  {o.status === "paid" ? <Badge tone="success">Đã trả</Badge> : o.status === "pending" ? <Badge tone="warning">Chờ CK</Badge> : <Badge tone="neutral">{o.status}</Badge>}
                  <span className="text-muted-foreground text-xs">{timeAgo(o.created_at, now)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
