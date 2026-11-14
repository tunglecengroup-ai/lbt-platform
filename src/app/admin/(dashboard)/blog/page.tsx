import Link from "next/link";
import { CalendarClock, Check, ExternalLink, Plus, Undo2 } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody, SectionTitle } from "@/components/ui/page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { Field, inputClass } from "@/components/ui/field";
import { ConfirmButton } from "@/components/confirm-button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { vnDateTime, vnLocal } from "@/lib/blog-time";
import type { PostRow } from "@/lib/types";
import { approveFromList, createPost, reschedulePost } from "./actions";

type PostItem = Pick<PostRow, "id" | "kind" | "slug" | "title" | "is_published" | "published_at">;

const timeInput = "bg-background focus:border-primary h-8 rounded-md border px-2 text-xs outline-none";

function PostRowView({ p, now }: { p: PostItem; now: Date }) {
  const href = p.kind === "post" ? `/blog/${p.slug}` : `/p/${p.slug}`;
  const future = new Date(p.published_at) > now;
  const scheduled = p.is_published && future;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1 basis-64">
        <Link href={`/admin/blog/${p.id}`} className="hover:text-primary font-medium">{p.title}</Link>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {scheduled ? "Hẹn đăng " : p.is_published ? "Đăng lúc " : future ? "Giờ hẹn dự kiến " : "Tạo/sửa "}
          {vnDateTime(p.published_at)}
        </p>
      </div>

      {!p.is_published ? (
        <>
          <Badge tone="neutral"><Dot /> Nháp</Badge>
          {/* Duyệt ngay tại danh sách: chọn giờ (trống = giữ giờ hẹn sẵn có, không có thì đăng ngay) */}
          <form action={approveFromList} className="flex items-center gap-1.5">
            <input type="hidden" name="id" value={p.id} />
            <input
              type="datetime-local"
              name="when"
              defaultValue={future ? vnLocal(p.published_at) : ""}
              aria-label="Giờ đăng"
              title="Để trống = đăng ngay"
              className={timeInput}
            />
            <Button type="submit" size="sm"><Check className="size-3.5" /> Duyệt đăng</Button>
          </form>
        </>
      ) : scheduled ? (
        <>
          <Badge tone="warning"><CalendarClock className="size-3" /> Hẹn giờ</Badge>
          <form action={reschedulePost} className="flex items-center gap-1.5">
            <input type="hidden" name="id" value={p.id} />
            <input type="datetime-local" name="when" required defaultValue={vnLocal(p.published_at)} aria-label="Đổi giờ đăng" className={timeInput} />
            <Button type="submit" size="sm" variant="outline">Đổi giờ</Button>
          </form>
          <form action={reschedulePost}>
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="unpublish" value="1" />
            <ConfirmButton size="sm" variant="ghost" message="Gỡ lịch, đưa bài về nháp?" aria-label="Về nháp"><Undo2 className="size-3.5" /></ConfirmButton>
          </form>
        </>
      ) : (
        <>
          <Badge tone="success"><Dot /> Đã đăng</Badge>
          <Link href={href} target="_blank" aria-label="Xem trên web" className="text-muted-foreground hover:text-foreground">
            <ExternalLink className="size-4" />
          </Link>
        </>
      )}
    </div>
  );
}

export default async function AdminBlogPage({ searchParams }: PageProps<"/admin/blog">) {
  const sp = await searchParams;
  const { data } = await createAdminSupabase()
    .from("posts")
    .select("id, kind, slug, title, is_published, published_at")
    .order("published_at", { ascending: false });
  const all = (data ?? []) as PostItem[];
  const now = new Date();

  const posts = all.filter((p) => p.kind === "post");
  const groups = [
    { key: "nhap", title: "Chờ duyệt (nháp)", rows: posts.filter((p) => !p.is_published).sort((a, b) => a.published_at.localeCompare(b.published_at)) },
    { key: "hen", title: "Đã duyệt, hẹn giờ đăng", rows: posts.filter((p) => p.is_published && new Date(p.published_at) > now).sort((a, b) => a.published_at.localeCompare(b.published_at)) },
    { key: "dang", title: "Đã đăng", rows: posts.filter((p) => p.is_published && new Date(p.published_at) <= now) },
  ];
  const pages = all.filter((p) => p.kind === "page");

  return (
    <>
      <Topbar title="Blog & trang" subtitle="Viết bài SEO, duyệt + hẹn giờ đăng, sửa trang giới thiệu / liên hệ" />
      <PageBody>
        <MobileHeading title="Blog & trang" />

        {sp.loi === "thieu-so" && (
          <p className="bg-danger-soft text-danger mb-4 rounded-md px-4 py-3 text-sm">
            Bài còn chỗ đánh dấu “[CẦN SỐ THẬT]” — mở bài, điền số liệu thật rồi mới duyệt được.{" "}
            {typeof sp.bai === "string" && <Link href={`/admin/blog/${sp.bai}`} className="font-semibold underline">Mở bài</Link>}
          </p>
        )}

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

        {groups.map((g) => (
          <section key={g.key} className="mb-8">
            <SectionTitle title={`${g.title} (${g.rows.length})`} />
            {g.key === "nhap" && g.rows.length > 0 && (
              <p className="text-muted-foreground -mt-1 mb-2 text-xs">
                Chọn giờ rồi bấm “Duyệt đăng” — để trống ô giờ: bài đã có giờ hẹn thì giữ giờ đó, chưa có thì đăng ngay. Giờ theo giờ Việt Nam.
              </p>
            )}
            <Card className="divide-y">
              {g.rows.length === 0 && <p className="text-muted-foreground p-4 text-sm">Chưa có.</p>}
              {g.rows.map((p) => <PostRowView key={p.id} p={p} now={now} />)}
            </Card>
          </section>
        ))}

        <section className="mb-8">
          <SectionTitle title={`Trang tĩnh (${pages.length})`} />
          <Card className="divide-y">
            {pages.length === 0 && <p className="text-muted-foreground p-4 text-sm">Chưa có.</p>}
            {pages.map((p) => <PostRowView key={p.id} p={p} now={now} />)}
          </Card>
        </section>
      </PageBody>
    </>
  );
}
