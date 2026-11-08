import Link from "next/link";
import { Crown, Users, CalendarClock, ExternalLink } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Field, inputClass } from "@/components/ui/field";
import { ConfirmButton } from "@/components/confirm-button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { PLAN_COLUMNS, type MembershipPlan } from "@/lib/membership";
import { marketingHref } from "@/lib/site";
import { formatDate, formatShortVND, formatVND } from "@/lib/utils";
import { cancelMembership, savePlan } from "./actions";

export const dynamic = "force-dynamic";

function PlanForm({ plan, courses }: { plan?: MembershipPlan; courses: { id: string; title: string }[] }) {
  return (
    <form action={savePlan} className="grid gap-4 sm:grid-cols-2">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <Field label="Tên gói"><input name="name" required defaultValue={plan?.name} className={inputClass} /></Field>
      <Field label="Đường dẫn" hint="lebatung.com/thanh-vien/<đường-dẫn>/mua"><input name="slug" defaultValue={plan?.slug} className={inputClass} /></Field>
      <Field label="Câu mô tả ngắn" className="sm:col-span-2"><input name="tagline" defaultValue={plan?.tagline ?? ""} className={inputClass} /></Field>
      <Field label="Giá bán (đ)"><input name="price" inputMode="numeric" defaultValue={plan?.price_vnd ?? ""} className={inputClass} /></Field>
      <Field label="Giá gạch (đ)" hint="Để trống nếu không giảm giá"><input name="compare_price" inputMode="numeric" defaultValue={plan?.compare_price_vnd ?? ""} className={inputClass} /></Field>
      <Field label="Thời hạn (ngày)" hint="Tối đa 365"><input name="duration_days" type="number" min={1} max={365} defaultValue={plan?.duration_days ?? 365} className={inputClass} /></Field>
      <Field label="Lượt AI mỗi ngày" hint="Số lần dùng công cụ AI/ngày"><input name="ai_daily_quota" type="number" min={0} max={500} defaultValue={plan?.ai_daily_quota ?? 30} className={inputClass} /></Field>
      <Field label="Quyền lợi (mỗi dòng 1 ý)" className="sm:col-span-2">
        <textarea name="perks" rows={5} defaultValue={plan?.perks.join("\n")} className={`${inputClass} h-auto py-2`} />
      </Field>
      <Field label="Khóa học trong gói" className="sm:col-span-2">
        <select name="course_scope" defaultValue={plan?.course_scope ?? "all"} className={inputClass}>
          <option value="all">Tất cả khóa đang mở bán (kể cả khóa mới sau này)</option>
          <option value="selected">Chỉ các khóa chọn bên dưới</option>
        </select>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {courses.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="course_ids" value={c.id} defaultChecked={plan?.course_ids.includes(c.id)} className="size-4" /> {c.title}
            </label>
          ))}
        </div>
      </Field>
      <Field label="GetResponse campaign ID" hint="Tự thêm thành viên mới vào list này"><input name="gr_campaign_id" defaultValue={plan?.gr_campaign_id ?? ""} className={inputClass} /></Field>
      <Field label="Thứ tự hiển thị"><input name="position" type="number" defaultValue={plan?.position ?? 0} className={inputClass} /></Field>
      <div className="flex flex-wrap gap-5 text-sm sm:col-span-2">
        <label className="flex items-center gap-2"><input type="checkbox" name="tools_access" defaultChecked={plan?.tools_access ?? true} className="size-4" /> Được dùng bộ công cụ AI</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="is_featured" defaultChecked={plan?.is_featured} className="size-4" /> Gói nổi bật</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="is_published" defaultChecked={plan?.is_published} className="size-4" /> Hiển thị & mở bán</label>
      </div>
      <div className="sm:col-span-2"><Button type="submit">{plan ? "Lưu gói" : "Tạo gói mới"}</Button></div>
    </form>
  );
}

export default async function MembershipAdminPage() {
  const db = createAdminSupabase();
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const [{ data: plans }, { data: courses }, { data: members }, { data: paid }] = await Promise.all([
    db.from("membership_plans").select(PLAN_COLUMNS).order("position"),
    db.from("courses").select("id, title").order("position"),
    db.from("memberships").select("id, user_id, plan_id, status, starts_at, expires_at, source").order("created_at", { ascending: false }).limit(500),
    db.from("orders").select("amount_vnd").eq("status", "paid").not("plan_id", "is", null),
  ]);
  const ids = [...new Set((members ?? []).map((m) => m.user_id))];
  const { data: profiles } = ids.length ? await db.from("profiles").select("id, email, full_name").in("id", ids) : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const planById = new Map(((plans ?? []) as MembershipPlan[]).map((p) => [p.id, p]));
  const active = (members ?? []).filter((m) => m.status === "active" && m.expires_at > now);
  const soon = active.filter((m) => new Date(m.expires_at).getTime() - nowDate.getTime() < 30 * 86_400_000);
  const revenue = (paid ?? []).reduce((s, o) => s + o.amount_vnd, 0);

  return (
    <>
      <Topbar title="Thành viên Member" subtitle="Gói thành viên: học tất cả khóa + bộ công cụ AI" />
      <PageBody>
        <MobileHeading title="Thành viên Member" />
        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="Thành viên còn hạn" value={String(new Set(active.map((m) => m.user_id)).size)} icon={Crown} />
          <StatCard label="Sắp hết hạn (30 ngày)" value={String(soon.length)} icon={CalendarClock} hint="chuỗi email gia hạn tự gửi" />
          <StatCard label="Tổng lượt kích hoạt" value={String(members?.length ?? 0)} icon={Users} />
          <StatCard label="Doanh thu gói" value={formatShortVND(revenue)} icon={Crown} hint="đơn đã thanh toán" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="min-w-0 space-y-6">
            {((plans ?? []) as MembershipPlan[]).map((p) => (
              <Card key={p.id}>
                <CardHeader>
                  <div>
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      {p.name}
                      {p.is_published ? <Badge tone="success"><Dot /> Đang bán</Badge> : <Badge tone="neutral"><Dot /> Ẩn</Badge>}
                    </CardTitle>
                    <CardDescription>{formatVND(p.price_vnd)} · {p.duration_days} ngày · {p.course_scope === "all" ? "tất cả khóa" : `${p.course_ids.length} khóa`}</CardDescription>
                  </div>
                  <Link href={marketingHref(`/thanh-vien/${p.slug}/mua`)} target="_blank" className="text-primary inline-flex items-center gap-1 text-sm font-medium">
                    Xem trang <ExternalLink className="size-3.5" />
                  </Link>
                </CardHeader>
                <CardContent>
                  <details>
                    <summary className="text-primary cursor-pointer text-sm font-medium">Sửa gói</summary>
                    <div className="mt-4"><PlanForm plan={p} courses={courses ?? []} /></div>
                  </details>
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardHeader><CardTitle>Tạo gói mới</CardTitle></CardHeader>
              <CardContent><PlanForm courses={courses ?? []} /></CardContent>
            </Card>
          </div>

          <Card className="h-fit overflow-hidden">
            <CardHeader>
              <div>
                <CardTitle>Thành viên ({members?.length ?? 0})</CardTitle>
                <CardDescription>Kích hoạt tay cho 1 người: Học viên → bấm tên → &quot;Gói thành viên&quot;.</CardDescription>
              </div>
            </CardHeader>
            <ul className="divide-y text-sm">
              {(members ?? []).length === 0 && <li className="text-muted-foreground px-5 py-6 text-center">Chưa có thành viên</li>}
              {(members ?? []).slice(0, 200).map((m) => {
                const p = profileById.get(m.user_id);
                const live = m.status === "active" && m.expires_at > now;
                return (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/students/${m.user_id}`} className="block truncate font-medium hover:underline">{p?.full_name || p?.email || "—"}</Link>
                      <p className="text-muted-foreground truncate text-xs">
                        {planById.get(m.plan_id)?.name} · đến {formatDate(m.expires_at)} · {m.source === "order" ? "mua" : m.source === "api" ? "API" : "admin"}
                      </p>
                    </div>
                    {live ? (
                      <form action={cancelMembership}>
                        <input type="hidden" name="id" value={m.id} />
                        <ConfirmButton variant="ghost" size="sm" message="Hủy gói thành viên này? (Quyền học các khóa đã mở vẫn giữ tới hạn — muốn thu hồi thì xóa ở trang học viên)">Hủy</ConfirmButton>
                      </form>
                    ) : (
                      <Badge tone="neutral">{m.status === "cancelled" ? "Đã hủy" : "Hết hạn"}</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
