import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody, SectionTitle } from "@/components/ui/page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { Field, inputClass } from "@/components/ui/field";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import type { PostRow } from "@/lib/types";
import { createPost } from "./actions";

type PostItem = Pick<PostRow, "id" | "kind" | "slug" | "title" | "is_published" | "published_at">;

export default async function AdminBlogPage() {
  const { data } = await createAdminSupabase()
    .from("posts")
    .select("id, kind, slug, title, is_published, published_at")
    .order("published_at", { ascending: false });
  const all = (data ?? []) as PostItem[];

  return (
    <>
      <Topbar title="Blog & trang" subtitle="Viết bài SEO, sửa trang giới thiệu / liên hệ" />
      <PageBody>
        <MobileHeading title="Blog & trang" />

        <Card className="mb-6">
          <CardContent>
            <form action={createPost} className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
              <Field label="Tiêu đề bài mới"><input name="title" required className={inputClass} placeholder="VD: 5 lỗi khiến quảng cáo không ra đơn" /></Field>
              <Field label="Loại">
                <select name="kind" className={inputClass}>
                  <option value="post">Bài blog</option>
                  <option value="page">Trang tĩnh (/p/...)</option>
                </select>
              </Field>
              <Button type="submit"><Plus className="size-4" /> Tạo bài</Button>
            </form>
          </CardContent>
        </Card>

        {(["post", "page"] as const).map((kind) => {
          const rows = all.filter((p) => p.kind === kind);
          return (
            <section key={kind} className="mb-8">
              <SectionTitle title={kind === "post" ? `Bài blog (${rows.length})` : `Trang tĩnh (${rows.length})`} />
              <Card className="divide-y">
                {rows.length === 0 && <p className="text-muted-foreground p-4 text-sm">Chưa có.</p>}
                {rows.map((p) => {
                  const href = kind === "post" ? `/blog/${p.slug}` : `/p/${p.slug}`;
                  return (
                    <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <Link href={`/admin/blog/${p.id}`} className="hover:text-primary min-w-0 flex-1 font-medium">{p.title}</Link>
                      <span className="text-muted-foreground text-xs">{formatDate(p.published_at)}</span>
                      <Badge tone={p.is_published ? "success" : "neutral"}><Dot /> {p.is_published ? "Đã đăng" : "Nháp"}</Badge>
                      {p.is_published && (
                        <Link href={href} target="_blank" aria-label="Xem trên web" className="text-muted-foreground hover:text-foreground">
                          <ExternalLink className="size-4" />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </Card>
            </section>
          );
        })}
      </PageBody>
    </>
  );
}
