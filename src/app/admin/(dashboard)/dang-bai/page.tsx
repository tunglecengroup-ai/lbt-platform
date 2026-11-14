import Link from "next/link";
import { Plus } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, inputClass } from "@/components/ui/field";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { vnDateTime } from "@/lib/blog-time";
import { SOCIAL, SOCIAL_ORDER, type SocialChannel, type SocialPost } from "@/lib/social";
import { createSocialPost } from "./actions";
import { STATUS } from "./status";

export const dynamic = "force-dynamic";


export default async function SocialPostsPage() {
  const { data } = await createAdminSupabase().from("social_posts").select("*").order("created_at", { ascending: false }).limit(100);
  const posts = (data ?? []) as SocialPost[];

  return (
    <>
      <Topbar title="Đăng bài đa kênh" subtitle="Soạn 1 lần → kiểm tra luật → duyệt → web tự đăng / hẹn giờ ra các kênh" />
      <PageBody>
        <MobileHeading title="Đăng bài" />
        <div className="mb-6 grid gap-6 xl:grid-cols-[1fr_380px]">
          <Card>
            <CardContent>
              <form action={createSocialPost} className="flex flex-wrap items-end gap-3">
                <Field label="Bài mới" className="min-w-64 flex-1"><input name="title" required className={inputClass} placeholder="vd: Reel 3 lỗi quảng cáo tin nhắn" /></Field>
                <Button type="submit"><Plus className="size-4" /> Soạn bài</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><div><CardTitle>Kênh đã kết nối</CardTitle><CardDescription>Kênh chưa kết nối: thêm biến trên Netlify</CardDescription></div></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {SOCIAL_ORDER.map((c) => (
                <div key={c} className="flex items-center justify-between gap-2">
                  <span>{SOCIAL[c].label}</span>
                  {!SOCIAL[c].auto ? <Badge tone="neutral">Đăng tay</Badge> : SOCIAL[c].ready() ? <Badge tone="success">Tự đăng</Badge> : <Badge tone="warning" >Chưa kết nối</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="divide-y">
          {posts.length === 0 && <p className="text-muted-foreground p-6 text-center text-sm">Chưa có bài nào.</p>}
          {posts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1 basis-64">
                <Link href={`/admin/dang-bai/${p.id}`} className="hover:text-primary font-medium">{p.title}</Link>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {p.channels.map((c) => SOCIAL[c as SocialChannel]?.label ?? c).join(" · ") || "chưa chọn kênh"}
                  {" · "}
                  {p.scheduled_at ? `hẹn ${vnDateTime(p.scheduled_at)}` : "đăng ngay khi duyệt"}
                </p>
              </div>
              <Badge tone={STATUS[p.status]?.tone ?? "neutral"}>{STATUS[p.status]?.label ?? p.status}</Badge>
            </div>
          ))}
        </Card>
      </PageBody>
    </>
  );
}
