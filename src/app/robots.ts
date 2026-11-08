import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { learnHost, siteUrl } from "@/lib/site";

/**
 * robots.txt theo tên miền:
 *  • hoc.lebatung.com (khu học + admin): chặn toàn bộ — nội dung trả phí, không cần lên Google
 *  • lebatung.com: cho Google + các bot AI search (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…) đọc trang công khai (AEO/GEO)
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = ((await headers()).get("host") ?? "").split(":")[0];
  if (learnHost && host === learnHost) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const privatePaths = ["/admin", "/hoc", "/api", "/don-hang", "/auth", "/thanh-vien/*/mua", "/khoa-hoc/*/mua"];
  const aiBots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended", "Bingbot"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      { userAgent: aiBots, allow: "/", disallow: privatePaths },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
