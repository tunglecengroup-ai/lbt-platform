import Link from "next/link";
import { RotateCcw, X } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isZnsConfigured } from "@/lib/zalo";
import { timeAgo } from "@/lib/utils";
import { cancelOutbox, retryOutbox, saveRefreshToken } from "./actions";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: "neutral" | "info" | "success" | "warning" | "danger" }> = {
  pending: { label: "Chờ gửi", tone: "info" },
  sending: { label: "Đang gửi", tone: "warning" },
  sent: { label: "Đã gửi", tone: "success" },
  failed: { label: "Lỗi", tone: "danger" },
  cancelled: { label: "Đã hủy", tone: "neutral" },
};

/** Mốc 24 giờ trước (để ngoài component cho đúng luật React) */
const since24h = () => new Date(Date.now() - 86_400_000).toISOString();

export default async function ZaloPage() {
  const db = createAdminSupabase();
  const since = since24h();
  const [{ data: items }, { data: token }, { count: pending }, { count: sentToday }, { count: zns }] = await Promise.all([
    db.from("zalo_outbox").select("id, phone, name, text, status, error, attempts, created_at, sent_at").order("created_at", { ascending: false }).limit(60),
    db.from("zalo_oa_tokens").select("access_token, expires_at, updated_at").eq("id", 1).maybeSingle(),
    db.from("zalo_outbox").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("zalo_outbox").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", since),
    db.from("automation_messages").select("id", { count: "exact", head: true }).eq("channel", "zalo").eq("status", "sent").not("provider_id", "is", null).gte("sent_at", since),
  ]);
  const znsReady = isZnsConfigured() && !!token?.access_token;

  return (
    <>
      <Topbar title="Kênh Zalo" subtitle="Chăm sóc khách đăng ký chưa thanh toán qua Zalo: ZNS chính thức + Zalo cá nhân" />
      <PageBody>
        <MobileHeading title="Kênh Zalo" />
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <div>
                <CardTitle>Hàng chờ Zalo cá nhân</CardTitle>
                <CardDescription>Tiện ích Chrome “Zalo CSKH” trên máy anh lấy từng tin ở đây, gửi qua chat.zalo.me rồi báo lại. Máy tắt thì tin nằm chờ, mở lại tự gửi tiếp.</CardDescription>
              </div>
            </CardHeader>
            <ul className="divide-y text-sm">
              {(items ?? []).length === 0 && <li className="text-muted-foreground px-5 py-4">Chưa có tin nào</li>}
              {(items ?? []).map((m) => (
                <li key={m.id} className="flex gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {m.name || "Khách"} · {m.phone}
                      <Badge tone={STATUS[m.status]?.tone ?? "neutral"}>{STATUS[m.status]?.label ?? m.status}</Badge>
                    </p>
                    <p className="text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line text-xs">{m.text}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {timeAgo(m.created_at)}{m.sent_at ? ` · gửi ${timeAgo(m.sent_at)}` : ""}{m.error ? ` · ${m.error}` : ""}
                    </p>
                  </div>
                  {(m.status === "pending" || m.status === "sending") && (
                    <form action={cancelOutbox}><input type="hidden" name="id" value={m.id} /><Button variant="ghost" size="sm" aria-label="Hủy"><X className="size-4" /></Button></form>
                  )}
                  {m.status === "failed" && (
                    <form action={retryOutbox}><input type="hidden" name="id" value={m.id} /><Button variant="ghost" size="sm" aria-label="Gửi lại"><RotateCcw className="size-4" /></Button></form>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>24 giờ qua</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-3 gap-2 text-center text-sm">
                <div><p className="text-lg font-semibold">{pending ?? 0}</p><p className="text-muted-foreground text-xs">đang chờ</p></div>
                <div><p className="text-lg font-semibold">{sentToday ?? 0}</p><p className="text-muted-foreground text-xs">Zalo cá nhân</p></div>
                <div><p className="text-lg font-semibold">{zns ?? 0}</p><p className="text-muted-foreground text-xs">ZNS</p></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Zalo OA (ZNS) <Badge tone={znsReady ? "success" : "neutral"}><Dot /> {znsReady ? "Đã kết nối" : "Chưa kết nối"}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!isZnsConfigured() && <p className="text-muted-foreground text-xs">Cần thêm ZALO_APP_ID và ZALO_APP_SECRET trên Netlify (lấy ở developers.zalo.me → ứng dụng đã liên kết OA).</p>}
                {token?.updated_at && <p className="text-muted-foreground text-xs">Token cập nhật {timeAgo(token.updated_at)}{token.expires_at ? `, hết hạn ${timeAgo(token.expires_at)}` : ""}.</p>}
                <form action={saveRefreshToken} className="space-y-2">
                  <Field label="Refresh token OA" hint="Dán 1 lần, hệ thống tự gia hạn về sau">
                    <input name="refresh_token" autoComplete="off" className={inputClass} />
                  </Field>
                  <Button type="submit" size="sm" variant="outline">Lưu và kiểm tra</Button>
                </form>
                <p className="text-muted-foreground text-xs">
                  Bước Zalo có “Mã mẫu ZNS” (mẫu đã được Zalo duyệt) thì gửi ZNS; ZNS lỗi hoặc bỏ trống mã thì tự chuyển sang hàng chờ Zalo cá nhân. Gắn mã ở <Link href="/admin/automation" className="underline">Automation</Link>.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}
