import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isValidApproveToken, MISSING_FACT_MARK } from "@/lib/blog-approve";
import { approvePost } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Duyệt bài blog", robots: { index: false, follow: false } };

/**
 * Trang xem trước + duyệt bài blog nháp, mở từ nút trên Telegram.
 * Không cần đăng nhập admin: link có chữ ký riêng cho từng bài (src/lib/blog-approve.ts).
 */
export default async function DuyetBaiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const t = typeof sp.t === "string" ? sp.t : "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !isValidApproveToken(id, t)) notFound();

  const { data: post } = await createAdminSupabase()
    .from("posts")
    .select("id, slug, title, excerpt, category, content_html, is_published, published_at")
    .eq("id", id)
    .single();
  if (!post) notFound();

  const missing = post.content_html.split(MISSING_FACT_MARK).length - 1;
  const words = post.content_html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const html = post.content_html.replaceAll(MISSING_FACT_MARK, `<mark style="background:#fde047;color:#000">${MISSING_FACT_MARK}</mark>`);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <div className="bg-muted/60 sticky top-0 z-10 -mx-4 mb-6 rounded-b-xl border-b px-4 py-4 backdrop-blur md:rounded-xl md:border">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Bài blog chờ duyệt · {post.category ?? "Chưa phân loại"} · {words} chữ</p>
        <p className="mt-1 text-sm">Đường dẫn: <code>/blog/{post.slug}</code></p>
        {sp.ok && <p className="mt-2 rounded-md bg-green-600/15 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-400">Đã đăng. Bài đang hiện ở /blog/{post.slug}</p>}
        {sp.loi === "thieu-so" && <p className="mt-2 rounded-md bg-red-600/15 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400">Chưa đăng được: bài còn {missing} chỗ {MISSING_FACT_MARK}. Sửa ở trang admin rồi đăng.</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {post.is_published ? (
            <Button asChild><Link href={`/blog/${post.slug}`} target="_blank">Xem bài đã đăng</Link></Button>
          ) : (
            <form action={approvePost}>
              <input type="hidden" name="id" value={post.id} />
              <input type="hidden" name="t" value={t} />
              <Button type="submit" disabled={missing > 0}>Duyệt & đăng ngay</Button>
            </form>
          )}
          <Button asChild variant="outline"><Link href={`/admin/blog/${post.id}`} target="_blank">Sửa trong admin</Link></Button>
        </div>
        {missing > 0 && !post.is_published && <p className="text-muted-foreground mt-2 text-xs">Còn {missing} chỗ đánh dấu vàng cần anh điền số thật.</p>}
      </div>

      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{post.title}</h1>
      {post.excerpt && <p className="text-muted-foreground mt-3 text-sm italic">Mô tả Google: {post.excerpt}</p>}
      <article className="post-content mt-8" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
