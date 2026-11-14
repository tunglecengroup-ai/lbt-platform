import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { approveToken, isValidWeekToken, MISSING_FACT_MARK, weekRange } from "@/lib/blog-approve";
import { approveWeek, unapprovePost } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Duyệt bài blog cả tuần", robots: { index: false, follow: false } };

const fmt = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
/** Giờ hiện tại phía server (trang force-dynamic, mỗi lần mở là 1 lần tính) */
const serverNow = () => Date.now();
const words = (html: string) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

/**
 * Trang duyệt lịch blog 1 tuần (gửi qua Telegram mỗi tuần 1 lần, công cụ D:\Git\blog-auto).
 * Bài đã duyệt giữ nguyên giờ hẹn, đến giờ tự hiện trên /blog.
 */
export default async function DuyetTuanPage({
  params,
  searchParams,
}: {
  params: Promise<{ tuan: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tuan } = await params;
  const sp = await searchParams;
  const t = typeof sp.t === "string" ? sp.t : "";
  if (!isValidWeekToken(tuan, t)) notFound();
  const { start, end } = weekRange(tuan);

  const { data } = await createAdminSupabase()
    .from("posts")
    .select("id, slug, title, excerpt, category, cover_url, content_html, is_published, published_at")
    .eq("kind", "post")
    .gte("published_at", start)
    .lt("published_at", end)
    .order("published_at");
  const posts = (data ?? []).map((p) => ({ ...p, missing: p.content_html.split(MISSING_FACT_MARK).length - 1, words: words(p.content_html) }));
  const now = serverNow();
  const cho = posts.filter((p) => !p.is_published);
  const choDuyetDuoc = cho.filter((p) => p.missing === 0).length;
  const sunday = new Date(new Date(end).getTime() - 86_400_000);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Lịch blog hoc.lebatung.com</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
        Tuần {new Date(start).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} – {sunday.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        {posts.length} bài · {posts.length - cho.length} đã duyệt · {cho.length} chờ duyệt. Bài đã duyệt tự hiện trên web đúng giờ hẹn.
      </p>
      {typeof sp.da === "string" && (
        <p className="mt-3 rounded-md bg-green-600/15 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-400">Đã duyệt {sp.da} bài.</p>
      )}

      {choDuyetDuoc > 0 && (
        <form action={approveWeek} className="mt-5">
          <input type="hidden" name="tuan" value={tuan} />
          <input type="hidden" name="t" value={t} />
          <Button type="submit" className="h-12 px-6 text-base">Duyệt tất cả {choDuyetDuoc} bài chờ duyệt</Button>
        </form>
      )}

      <ol className="mt-8 grid gap-4">
        {posts.map((p) => {
          const future = new Date(p.published_at).getTime() > now;
          return (
            <li key={p.id} className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row">
              {p.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_url} alt="" width={1280} height={720} className="aspect-video w-full shrink-0 rounded-lg object-cover sm:w-52" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-xs font-medium">
                  {fmt.format(new Date(p.published_at))} · {p.category ?? "Chưa phân loại"} · {p.words} chữ
                </p>
                <h2 className="mt-1 font-semibold leading-snug">{p.title}</h2>
                {p.excerpt && <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{p.excerpt}</p>}
                <p className="mt-2 text-xs font-medium">
                  {p.is_published ? (
                    <span className="text-green-700 dark:text-green-400">{future ? "Đã duyệt, chờ tới giờ đăng" : "Đã đăng"}</span>
                  ) : p.missing > 0 ? (
                    <span className="text-red-700 dark:text-red-400">Còn {p.missing} chỗ {MISSING_FACT_MARK}, sửa trong admin trước</span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400">Chờ duyệt</span>
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/duyet-bai/${p.id}?t=${approveToken(p.id)}`} target="_blank">Đọc bài</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/blog/${p.id}`} target="_blank">Sửa</Link>
                  </Button>
                  {!p.is_published && p.missing === 0 && (
                    <form action={approveWeek}>
                      <input type="hidden" name="tuan" value={tuan} />
                      <input type="hidden" name="t" value={t} />
                      <input type="hidden" name="id" value={p.id} />
                      <Button type="submit" size="sm">Duyệt bài này</Button>
                    </form>
                  )}
                  {p.is_published && future && (
                    <form action={unapprovePost}>
                      <input type="hidden" name="tuan" value={tuan} />
                      <input type="hidden" name="t" value={t} />
                      <input type="hidden" name="id" value={p.id} />
                      <Button type="submit" size="sm" variant="ghost">Bỏ duyệt</Button>
                    </form>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        {posts.length === 0 && <p className="text-muted-foreground text-sm">Tuần này chưa có bài nào.</p>}
      </ol>
    </main>
  );
}
