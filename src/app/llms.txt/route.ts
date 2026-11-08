import { createPublicSupabase } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AUTHOR, BRAND, siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * /llms.txt — bản tóm tắt trang web cho các trợ lý AI (ChatGPT, Claude, Perplexity…) theo đề xuất llmstxt.org.
 * Giúp AI trích dẫn đúng: ai là tác giả, có những khóa nào, trang nào nên đọc.
 */
export async function GET() {
  const lines = [
    `# ${BRAND.name}`,
    "",
    `> ${BRAND.description} Người sáng lập: ${AUTHOR.name} — ${AUTHOR.bio}`,
    "",
    "## Trang chính",
    `- [Trang chủ + video học thử quảng cáo Facebook](${siteUrl}/)`,
    `- [Gói thành viên LBT Member](${siteUrl}/thanh-vien): học tất cả khóa + công cụ AI quảng cáo`,
    `- [Về ${AUTHOR.name}](${siteUrl}${AUTHOR.aboutPath})`,
    `- [Blog](${siteUrl}/blog)`,
  ];
  if (isSupabaseConfigured) {
    const db = createPublicSupabase();
    const [{ data: courses }, { data: posts }] = await Promise.all([
      db.from("courses").select("slug, title, subtitle").eq("is_published", true).order("position"),
      db.from("posts").select("slug, title, excerpt").eq("kind", "post").eq("is_published", true).order("published_at", { ascending: false }).limit(30),
    ]);
    if (courses?.length) {
      lines.push("", "## Khóa học");
      for (const c of courses) lines.push(`- [${c.title}](${siteUrl}/khoa-hoc/${c.slug})${c.subtitle ? `: ${c.subtitle}` : ""}`);
    }
    if (posts?.length) {
      lines.push("", "## Bài viết");
      for (const p of posts) lines.push(`- [${p.title}](${siteUrl}/blog/${p.slug})${p.excerpt ? `: ${p.excerpt}` : ""}`);
    }
  }
  lines.push("", "## Ghi chú", "- Khu học viên (hoc.lebatung.com) là nội dung trả phí, cần đăng nhập.", "- Mỗi khóa học có thời hạn tối đa 12 tháng kể từ ngày kích hoạt.");
  return new Response(lines.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
