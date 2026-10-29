import type { MetadataRoute } from "next";
import { createPublicSupabase } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { siteUrl } from "@/lib/site";

// Đọc mới mỗi lần để bài/khóa vừa đăng có ngay trong sitemap
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/blog`, changeFrequency: "weekly", priority: 0.7 },
  ];
  if (!isSupabaseConfigured) return items;

  const db = createPublicSupabase();
  const [{ data: courses }, { data: posts }] = await Promise.all([
    db.from("courses").select("slug").eq("is_published", true),
    db.from("posts").select("kind, slug, updated_at"),
  ]);
  for (const c of courses ?? []) items.push({ url: `${siteUrl}/khoa-hoc/${c.slug}`, priority: 0.9 });
  for (const p of posts ?? []) {
    items.push({
      url: `${siteUrl}/${p.kind === "post" ? "blog" : "p"}/${p.slug}`,
      lastModified: p.updated_at,
      priority: p.kind === "post" ? 0.6 : 0.5,
    });
  }
  return items;
}
