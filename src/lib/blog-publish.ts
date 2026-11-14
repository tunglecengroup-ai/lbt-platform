import "server-only";
import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { notifyTelegram } from "@/lib/email";
import { siteUrl } from "@/lib/site";

/** Khóa IndexNow (file public/<khóa>.txt) — dùng chung với công cụ blog-auto */
const INDEXNOW_KEY = () => process.env.INDEXNOW_KEY || "933cad8542494b759807f473e1ce260f";

/** Báo Bing / Cốc Cốc / Yandex (và các AI dùng chỉ mục Bing) có trang mới — miễn phí, không cần tài khoản */
export async function pingIndexNow(urls: string[]) {
  if (!urls.length) return "bỏ qua";
  // Chỉ báo từ web thật (máy test không gửi link giả cho công cụ tìm kiếm)
  if (process.env.NODE_ENV !== "production" || !(process.env.NETLIFY || process.env.URL || process.env.SITE_NAME)) return "bỏ qua (không phải web thật)";
  const host = new URL(siteUrl).hostname;
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key: INDEXNOW_KEY(), keyLocation: `${siteUrl}/${INDEXNOW_KEY()}.txt`, urlList: urls }),
    });
    return `HTTP ${res.status}`;
  } catch (e) {
    return `lỗi ${(e as Error).message.slice(0, 80)}`;
  }
}

/**
 * Cron 5 phút/lần: bài hẹn giờ vừa tới giờ -> làm mới trang blog/trang chủ ngay (không chờ 5 phút cache),
 * báo IndexNow, nhắn Telegram, đánh dấu announced_at để không báo lại.
 */
export async function announceDuePosts() {
  const db = createAdminSupabase();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("posts")
    .select("id, kind, slug, title, published_at")
    .eq("is_published", true)
    .lte("published_at", now)
    .is("announced_at", null)
    .order("published_at")
    .limit(20);
  if (error) return { error: error.message };
  if (!data?.length) return { announced: 0 };

  const urls = data.map((p) => `${siteUrl}${p.kind === "page" ? "/p/" : "/blog/"}${p.slug}`);
  for (const p of data) revalidatePath(p.kind === "page" ? `/p/${p.slug}` : `/blog/${p.slug}`);
  revalidatePath("/blog");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");

  const indexnow = await pingIndexNow(urls);
  await db.from("posts").update({ announced_at: now }).in("id", data.map((p) => p.id));
  await notifyTelegram(
    `📰 Blog vừa lên sóng (${data.length} bài):\n` + data.map((p, i) => `• ${p.title}\n  ${urls[i]}`).join("\n") + `\nIndexNow: ${indexnow}`,
  );
  return { announced: data.length, indexnow };
}
