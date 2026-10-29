import { notFound } from "next/navigation";
import { getPublishedPost } from "@/lib/content";

export async function generateMetadata({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const page = await getPublishedPost("page", slug);
  return page
    ? { title: `${page.title} — Học viện Lê Bá Tùng`, description: page.excerpt ?? undefined, alternates: { canonical: `/p/${page.slug}` } }
    : {};
}

/** Trang tĩnh: Lê Bá Tùng là ai, Liên hệ, Điều khoản... (sửa trong Admin → Blog & trang) */
export default async function StaticPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const page = await getPublishedPost("page", slug);
  if (!page) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{page.title}</h1>
      <article className="post-content mt-8" dangerouslySetInnerHTML={{ __html: page.content_html }} />
    </main>
  );
}
