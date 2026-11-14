import Link from "next/link";
import { Mail, Send, Zap, MousePointerClick, Eye, CircleAlert, CircleCheck, Settings2 } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { TRIGGER_LABEL, type Trigger } from "@/lib/automation";
import { isEmailConfigured } from "@/lib/email";
import { timeAgo } from "@/lib/utils";
import { toggleFlow } from "./actions";
import { createFlow, deleteFlow, duplicateFlow } from "./campaign-actions";
import { Field, inputClass } from "@/components/ui/field";
import { ConfirmButton } from "@/components/confirm-button";
import { Copy, Trash2, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

export default async function AutomationPage() {
  const db = createAdminSupabase();
  const nowMs = new Date().getTime();
  const since = new Date(nowMs - 30 * 86_400_000).toISOString();
  const [{ data: flows }, { data: steps }, { data: runs }, { data: msgs }, { count: suppressed }] = await Promise.all([
    db.from("automation_flows").select("id, key, name, description, trigger, goal, is_active, kind, last_broadcast_count").order("created_at"),
    db.from("automation_steps").select("flow_id, is_active"),
    db.from("automation_runs").select("flow_id, status").eq("status", "active"),
    db.from("automation_messages").select("id, flow_id, email, subject, status, error, sent_at, opened_at, clicked_at").gte("sent_at", since).order("sent_at", { ascending: false }).limit(2000),
    db.from("email_suppressions").select("email", { count: "exact", head: true }),
  ]);
  const sent = (msgs ?? []).filter((m) => m.status === "sent");
  const opened = sent.filter((m) => m.opened_at).length;
  const clicked = sent.filter((m) => m.clicked_at).length;
  const emailOk = isEmailConfigured();
  const cronOk = !!(process.env.CRON_SECRET || process.env.APP_SESSION_SECRET);
  const tgOk = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);

  return (
    <>
      <Topbar title="Automation" subtitle="Chiến dịch chăm sóc: tự chạy theo hành vi khách, hoặc gửi theo nhóm khách" />
      <PageBody>
        <MobileHeading title="Automation" />

        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="Chiến dịch đang chạy" value={`${(flows ?? []).filter((f) => f.is_active).length}/${flows?.length ?? 0}`} icon={Zap} />
          <StatCard label="Email đã gửi (30 ngày)" value={String(sent.length)} icon={Send} hint={`${(runs ?? []).length} người đang trong chuỗi`} />
          <StatCard label="Tỷ lệ mở" value={pct(opened, sent.length)} icon={Eye} hint="Apple Mail có thể làm số mở cao hơn thực tế" />
          <StatCard label="Tỷ lệ bấm link" value={pct(clicked, sent.length)} icon={MousePointerClick} hint={`${suppressed ?? 0} người đã hủy nhận`} />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2"><Settings2 className="size-4" /> Tình trạng kết nối</CardTitle>
              <CardDescription>Kịch bản chỉ gửi khi đủ kết nối. Biến môi trường đặt ở Netlify → Project configuration → Environment variables.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
            {[
              { ok: emailOk, label: "Gửi email (Resend)", hint: "RESEND_API_KEY — gói miễn phí 100 email/ngày" },
              { ok: cronOk, label: "Lịch chạy 5 phút", hint: "CRON_SECRET (hoặc tự suy từ APP_SESSION_SECRET)" },
              { ok: tgOk, label: "Báo Telegram (tuỳ chọn)", hint: "TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID" },
            ].map((x) => (
              <div key={x.label} className="flex gap-2">
                {x.ok ? <CircleCheck className="text-success mt-0.5 size-4 shrink-0" /> : <CircleAlert className="text-warning mt-0.5 size-4 shrink-0" />}
                <div>
                  <p className="font-medium">{x.label}: {x.ok ? "đã kết nối" : "chưa cài"}</p>
                  <p className="text-muted-foreground text-xs">{x.hint}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader><div><CardTitle>Tạo chiến dịch mới</CardTitle><CardDescription>Tạo xong soạn từng bước (email / báo Telegram), kiểm tra rồi mới bật.</CardDescription></div></CardHeader>
          <CardContent>
            <form action={createFlow} className="grid gap-3 sm:grid-cols-[1fr_220px_240px_auto] sm:items-end">
              <Field label="Tên chiến dịch"><input name="name" required className={inputClass} placeholder="vd: Mời học viên cơ bản lên khóa chuyên sâu" /></Field>
              <Field label="Loại">
                <select name="kind" className={inputClass} defaultValue="trigger">
                  <option value="trigger">Tự chạy theo sự kiện</option>
                  <option value="broadcast">Gửi theo nhóm khách</option>
                </select>
              </Field>
              <Field label="Sự kiện kích hoạt" hint="Chỉ dùng cho loại tự chạy">
                <select name="trigger" className={inputClass} defaultValue="signup">
                  {Object.entries(TRIGGER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Button type="submit">Tạo</Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(flows ?? []).map((f) => {
            const fs = (msgs ?? []).filter((m) => m.flow_id === f.id && m.status === "sent");
            const stepCount = (steps ?? []).filter((s) => s.flow_id === f.id && s.is_active).length;
            const inFlow = (runs ?? []).filter((r) => r.flow_id === f.id).length;
            return (
              <Card key={f.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col">
                  <div className="flex items-start gap-3">
                    <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg"><Mail className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/admin/automation/${f.id}`} className="font-semibold tracking-tight hover:underline">{f.name}</Link>
                        <Badge tone={f.is_active ? "success" : "neutral"}><Dot /> {f.is_active ? "Đang chạy" : "Tắt"}</Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {f.kind === "broadcast" ? (
                          <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> Gửi theo nhóm khách{f.last_broadcast_count != null ? ` · lần gần nhất ${f.last_broadcast_count} người` : ""}</span>
                        ) : (
                          <><span className="font-medium">Kích hoạt:</span> {TRIGGER_LABEL[f.trigger as Trigger] ?? f.trigger}</>
                        )}
                      </p>
                      {f.description && <p className="text-muted-foreground mt-1 text-xs">{f.description}</p>}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 border-t pt-4 text-center">
                    {[
                      [stepCount, "email"],
                      [inFlow, "đang chờ"],
                      [fs.length, "đã gửi"],
                      [pct(fs.filter((m) => m.opened_at).length, fs.length), "mở"],
                    ].map(([v, l]) => (
                      <div key={String(l)}>
                        <p className="tabular text-lg font-semibold">{v}</p>
                        <p className="text-muted-foreground text-xs">{l}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button asChild variant="outline" size="sm"><Link href={`/admin/automation/${f.id}`}>Sửa nội dung</Link></Button>
                    <form action={toggleFlow}>
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="active" value={f.is_active ? "0" : "1"} />
                      <Button type="submit" size="sm" variant={f.is_active ? "ghost" : "primary"}>{f.is_active ? "Tắt" : "Bật"}</Button>
                    </form>
                    <form action={duplicateFlow} className="ml-auto">
                      <input type="hidden" name="id" value={f.id} />
                      <Button type="submit" size="sm" variant="ghost" aria-label="Nhân bản" title="Nhân bản"><Copy className="size-4" /></Button>
                    </form>
                    <form action={deleteFlow}>
                      <input type="hidden" name="id" value={f.id} />
                      <ConfirmButton size="sm" variant="ghost" className="text-danger" aria-label="Xóa" title="Xóa" message={`Xóa hẳn chiến dịch "${f.name}"? Các bước, người đang chờ và lịch sử gửi của chiến dịch này cũng bị xóa. Không hoàn tác được.`}><Trash2 className="size-4" /></ConfirmButton>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-6 overflow-hidden">
          <CardHeader><CardTitle>Email gửi gần đây</CardTitle></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-left">
                  <th className="px-4 py-2 font-medium">Khi nào</th>
                  <th className="px-4 py-2 font-medium">Người nhận</th>
                  <th className="px-4 py-2 font-medium">Tiêu đề</th>
                  <th className="px-4 py-2 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(msgs ?? []).length === 0 && <tr><td colSpan={4} className="text-muted-foreground px-4 py-6 text-center">Chưa gửi email nào</td></tr>}
                {(msgs ?? []).slice(0, 30).map((m) => (
                  <tr key={m.id}>
                    <td className="text-muted-foreground px-4 py-2 text-xs whitespace-nowrap">{timeAgo(m.sent_at)}</td>
                    <td className="px-4 py-2 text-xs">{m.email}</td>
                    <td className="max-w-xs truncate px-4 py-2 text-xs">{m.subject}</td>
                    <td className="px-4 py-2 text-xs">
                      {m.status === "sent" ? (
                        <Badge tone={m.clicked_at ? "success" : m.opened_at ? "info" : "neutral"}>{m.clicked_at ? "Đã bấm" : m.opened_at ? "Đã mở" : "Đã gửi"}</Badge>
                      ) : (
                        <span className="text-danger" title={m.error ?? ""}>{m.status === "failed" ? "Lỗi" : "Bỏ qua"}{m.error ? `: ${m.error}` : ""}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </PageBody>
    </>
  );
}
