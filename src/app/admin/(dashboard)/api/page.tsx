import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/confirm-button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { learnUrl, siteUrl } from "@/lib/site";
import { formatDate, timeAgo } from "@/lib/utils";
import { revokeApiKey } from "./actions";
import { KeyForm } from "./key-form";

export const dynamic = "force-dynamic";

const base = () => `${learnUrl || siteUrl}/api/v1`;

function Code({ children }: { children: string }) {
  return <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs leading-relaxed">{children}</pre>;
}

export default async function ApiPage() {
  const db = createAdminSupabase();
  const [{ data: keys }, { data: logs }, { data: courses }, { data: plans }] = await Promise.all([
    db.from("api_keys").select("id, name, key_prefix, last_used_at, revoked_at, created_at").order("created_at", { ascending: false }),
    db.from("api_requests").select("id, key_id, endpoint, external_id, status_code, request, created_at").order("created_at", { ascending: false }).limit(50),
    db.from("courses").select("slug, title").order("position"),
    db.from("membership_plans").select("slug, name").order("position"),
  ]);
  const keyName = new Map((keys ?? []).map((k) => [k.id, k.name]));

  return (
    <>
      <Topbar title="API kết nối" subtitle="Hệ thống khác (Pancake, Webcake, Haravan, n8n…) tự tạo tài khoản + mở khóa khi khách thanh toán" />
      <PageBody>
        <MobileHeading title="API kết nối" />
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Cách dùng</CardTitle>
                  <CardDescription>Khi khách thanh toán ở hệ thống khác, hệ thống đó gọi API này → học viên có tài khoản và quyền học ngay, đăng nhập bằng email ở hoc.lebatung.com.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p><b>1. Tạo tài khoản + mở khóa</b> — <code>POST {base()}/students</code></p>
                <Code>{`curl -X POST ${base()}/students \\
  -H "Authorization: Bearer lbt_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "khach@gmail.com",
    "name": "Nguyễn Văn A",
    "phone": "0912345678",
    "courses": ["${courses?.[0]?.slug ?? "facebook-ads-co-ban-den-nang-cao"}"],
    "external_id": "DON-12345"
  }'`}</Code>
                <ul className="text-muted-foreground list-disc space-y-1 pl-5">
                  <li><code>courses</code>: mã khóa (bảng bên dưới), nhiều khóa cách nhau dấu phẩy hoặc dạng mảng.</li>
                  <li><code>plan</code>: mở gói thành viên thay cho từng khóa, vd <code>&quot;plan&quot;: &quot;{plans?.[0]?.slug ?? "member-12-thang"}&quot;</code>.</li>
                  <li><code>days</code>: số ngày học cho lần này (tối đa 365). Bỏ trống = theo cài đặt khóa.</li>
                  <li><code>external_id</code>: mã đơn bên hệ thống của anh — gửi lại cùng mã sẽ <b>không cấp trùng</b>, trả về kết quả cũ.</li>
                  <li>Nhận cả JSON lẫn form (x-www-form-urlencoded). Email đã có tài khoản thì dùng lại, không tạo trùng.</li>
                </ul>
                <p><b>2. Tra cứu</b> — <code>GET {base()}/students?email=khach@gmail.com</code></p>
                <p><b>3. Thu hồi khi hoàn tiền</b> — <code>POST {base()}/students/revoke</code> với <code>{`{"email": "...", "courses": ["slug"]}`}</code> (bỏ courses = thu hồi tất cả; <code>{`"plan": "all"`}</code> hủy cả gói thành viên).</p>
                <p><b>4. Danh sách mã khóa/gói</b> — <code>GET {base()}/courses</code></p>
                <p className="text-muted-foreground">Kết quả thành công: <code>{`{"ok": true, "student": {...}, "enrollments": [...], "login_url": "..."}`}</code>. Lỗi: mã HTTP 401/404/422/500 kèm <code>{`{"ok": false, "error": {"code", "message"}}`}</code>.</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader><CardTitle>Nhật ký gọi API (50 lần gần nhất)</CardTitle></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted text-muted-foreground text-left">
                      <th className="px-4 py-2 font-medium">Thời gian</th>
                      <th className="px-4 py-2 font-medium">Khóa</th>
                      <th className="px-4 py-2 font-medium">Gọi</th>
                      <th className="px-4 py-2 font-medium">Email / mã đơn</th>
                      <th className="px-4 py-2 font-medium">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(logs ?? []).length === 0 && <tr><td colSpan={5} className="text-muted-foreground px-4 py-6 text-center">Chưa có lượt gọi nào</td></tr>}
                    {(logs ?? []).map((l) => (
                      <tr key={l.id}>
                        <td className="text-muted-foreground px-4 py-2 text-xs whitespace-nowrap">{timeAgo(l.created_at)}</td>
                        <td className="px-4 py-2 text-xs">{l.key_id ? keyName.get(l.key_id) : "—"}</td>
                        <td className="px-4 py-2 text-xs whitespace-nowrap">{l.endpoint}</td>
                        <td className="px-4 py-2 text-xs">{(l.request as { email?: string } | null)?.email} {l.external_id && <span className="text-muted-foreground">· {l.external_id}</span>}</td>
                        <td className="px-4 py-2"><Badge tone={l.status_code < 300 ? "success" : "danger"}>{l.status_code}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>API key</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <KeyForm />
                <ul className="divide-y text-sm">
                  {(keys ?? []).map((k) => (
                    <li key={k.id} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{k.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {k.key_prefix}… · tạo {formatDate(k.created_at)} · {k.last_used_at ? `dùng ${timeAgo(k.last_used_at)}` : "chưa dùng"}
                        </p>
                      </div>
                      {k.revoked_at ? (
                        <Badge tone="neutral">Đã thu hồi</Badge>
                      ) : (
                        <form action={revokeApiKey}>
                          <input type="hidden" name="id" value={k.id} />
                          <ConfirmButton variant="ghost" size="sm" className="text-danger" message={`Thu hồi khóa "${k.name}"? Hệ thống đang dùng khóa này sẽ không gọi được nữa.`}>Thu hồi</ConfirmButton>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Mã khóa học & gói</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {(courses ?? []).map((c) => (
                  <p key={c.slug} className="flex justify-between gap-2"><span className="truncate">{c.title}</span><code className="text-xs">{c.slug}</code></p>
                ))}
                {(plans ?? []).map((p) => (
                  <p key={p.slug} className="flex justify-between gap-2"><span className="truncate">Gói: {p.name}</span><code className="text-xs">{p.slug}</code></p>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}
