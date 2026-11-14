import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Trash2 } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { Field, inputClass } from "@/components/ui/field";
import { EmailEditor } from "@/components/email-editor";
import { LINK_TOKENS, TEXT_TOKENS, toFriendly } from "@/lib/email-tokens";
import { ConfirmButton } from "@/components/confirm-button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { TRIGGER_LABEL, type Trigger } from "@/lib/automation";
import { timeAgo } from "@/lib/utils";
import { deleteStep, saveFlow, saveStep, toggleFlow } from "../actions";
import { TestForm } from "./test-form";

export const dynamic = "force-dynamic";


function delayParts(min: number) {
  if (min > 0 && min % 1440 === 0) return { value: min / 1440, unit: "ngay" };
  if (min > 0 && min % 60 === 0) return { value: min / 60, unit: "gio" };
  return { value: min, unit: "phut" };
}

type Step = { id: string; position: number; delay_minutes: number; channel: string; subject: string | null; body: string; transactional: boolean; is_active: boolean };

function StepForm({ flowId, step, index }: { flowId: string; step?: Step; index: number }) {
  const d = delayParts(step?.delay_minutes ?? 1440);
  return (
    <form action={saveStep} className="grid gap-3 sm:grid-cols-[160px_1fr]">
      <input type="hidden" name="flow_id" value={flowId} />
      {step && <input type="hidden" name="id" value={step.id} />}
      <Field label={index === 0 ? "Gửi sau khi kích hoạt" : "Chờ sau bước trước"}>
        <div className="flex gap-1">
          <input name="delay" defaultValue={d.value} inputMode="decimal" className={`${inputClass} w-16`} />
          <select name="unit" defaultValue={d.unit} className={inputClass}>
            <option value="phut">phút</option>
            <option value="gio">giờ</option>
            <option value="ngay">ngày</option>
          </select>
        </div>
      </Field>
      <Field label="Tiêu đề email" hint="Gõ [Tên khách], [Tên khóa học]… để tự điền theo từng người">
        <input name="subject" defaultValue={toFriendly(step?.subject ?? "")} className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <p className="mb-1.5 text-sm font-medium">Nội dung email</p>
        <EmailEditor name="body" defaultValue={toFriendly(step?.body ?? "<p>Chào {{ten}},</p><p></p>")} />
        <p className="text-muted-foreground mt-1 text-xs">Viết như thư bình thường. Tên khách, tên khóa học… chèn bằng ô “Chèn thông tin khách”; link vào học, link thanh toán… chèn bằng ô “Chèn link có sẵn”.</p>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2">
        <select name="channel" defaultValue={step?.channel ?? "email"} className={`${inputClass} w-auto`}>
          <option value="email">Gửi email cho khách</option>
          <option value="telegram">Báo Telegram cho anh</option>
        </select>
        <label className="flex items-center gap-2" title="Email giao dịch: gửi cả ban đêm, bỏ qua giới hạn tần suất, không có link hủy nhận">
          <input type="checkbox" name="transactional" defaultChecked={step?.transactional} className="size-4" /> Email giao dịch
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={step?.is_active ?? true} className="size-4" /> Bật bước này</label>
        <Button type="submit" size="sm">{step ? "Lưu bước" : "Thêm bước"}</Button>
      </div>
    </form>
  );
}

export default async function FlowPage({ params }: PageProps<"/admin/automation/[id]">) {
  const { id } = await params;
  const db = createAdminSupabase();
  const { data: flow } = await db.from("automation_flows").select("*").eq("id", id).maybeSingle();
  if (!flow) notFound();
  const [{ data: steps }, { data: runs }, { data: msgs }] = await Promise.all([
    db.from("automation_steps").select("*").eq("flow_id", id).order("position"),
    db.from("automation_runs").select("status").eq("flow_id", id),
    db.from("automation_messages").select("id, email, subject, status, error, sent_at, opened_at, clicked_at, step_id").eq("flow_id", id).order("sent_at", { ascending: false }).limit(40),
  ]);
  const runCount = (s: string) => (runs ?? []).filter((r) => r.status === s).length;

  return (
    <>
      <Topbar title={flow.name} subtitle={`Kích hoạt: ${TRIGGER_LABEL[flow.trigger as Trigger] ?? flow.trigger}`} />
      <PageBody>
        <MobileHeading title={flow.name} />
        <Link href="/admin/automation" className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="size-4" /> Tất cả kịch bản
        </Link>

        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-4">
            {((steps ?? []) as Step[]).map((s, i) => (
              <Card key={s.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    Bước {i + 1}
                    <Badge tone="neutral"><Clock className="size-3" /> {s.delay_minutes === 0 ? "ngay" : `sau ${delayParts(s.delay_minutes).value} ${{ phut: "phút", gio: "giờ", ngay: "ngày" }[delayParts(s.delay_minutes).unit]}`}</Badge>
                    {s.transactional && <Badge tone="info">Giao dịch</Badge>}
                    {!s.is_active && <Badge tone="warning">Đang tắt</Badge>}
                  </CardTitle>
                  <form action={deleteStep}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="flow_id" value={id} />
                    <ConfirmButton variant="ghost" size="sm" className="text-danger" message="Xóa bước này?"><Trash2 className="size-4" /></ConfirmButton>
                  </form>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StepForm flowId={id} step={s} index={i} />
                  <div className="border-t pt-3"><TestForm stepId={s.id} /></div>
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardHeader><CardTitle>Thêm bước</CardTitle></CardHeader>
              <CardContent><StepForm flowId={id} index={(steps ?? []).length} /></CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Kịch bản <Badge tone={flow.is_active ? "success" : "neutral"}><Dot /> {flow.is_active ? "Đang chạy" : "Tắt"}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form action={saveFlow} className="space-y-3">
                  <input type="hidden" name="id" value={flow.id} />
                  <Field label="Tên"><input name="name" defaultValue={flow.name} className={inputClass} /></Field>
                  <Field label="Mô tả"><textarea name="description" rows={3} defaultValue={flow.description ?? ""} className={`${inputClass} h-auto py-2`} /></Field>
                  <Button type="submit" variant="outline" size="sm">Lưu</Button>
                </form>
                <form action={toggleFlow}>
                  <input type="hidden" name="id" value={flow.id} />
                  <input type="hidden" name="active" value={flow.is_active ? "0" : "1"} />
                  <Button type="submit" className="w-full" variant={flow.is_active ? "outline" : "primary"}>{flow.is_active ? "Tắt kịch bản" : "Bật kịch bản"}</Button>
                </form>
                {flow.goal && <p className="text-muted-foreground text-xs">Tự dừng khi: {{ enrolled: "khách mua/được mở khóa", order_paid: "đơn được thanh toán", active_again: "học viên học lại" }[flow.goal as string] ?? flow.goal}.</p>}
                <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center text-sm">
                  <div><p className="font-semibold">{runCount("active")}</p><p className="text-muted-foreground text-xs">đang chờ</p></div>
                  <div><p className="font-semibold">{runCount("done")}</p><p className="text-muted-foreground text-xs">xong</p></div>
                  <div><p className="font-semibold">{runCount("stopped")}</p><p className="text-muted-foreground text-xs">đã dừng</p></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Tự điền theo từng khách</CardTitle>
                  <CardDescription>Hệ thống thay bằng thông tin thật của từng người khi gửi.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex flex-wrap gap-1.5">
                  {TEXT_TOKENS.map((t) => <span key={t.key} className="bg-muted rounded px-1.5 py-0.5">[{t.label}]</span>)}
                </div>
                <p className="text-muted-foreground">Link có sẵn: {LINK_TOKENS.map((t) => t.label).join(" · ")}.</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader><CardTitle>Đã gửi gần đây</CardTitle></CardHeader>
              <ul className="divide-y text-xs">
                {(msgs ?? []).length === 0 && <li className="text-muted-foreground px-5 py-4">Chưa gửi</li>}
                {(msgs ?? []).map((m) => (
                  <li key={m.id} className="px-5 py-2">
                    <p className="truncate font-medium">{m.email}</p>
                    <p className="text-muted-foreground">
                      {timeAgo(m.sent_at)} · {m.status === "sent" ? (m.clicked_at ? "đã bấm" : m.opened_at ? "đã mở" : "đã gửi") : <span className="text-danger">{m.error ?? m.status}</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}
