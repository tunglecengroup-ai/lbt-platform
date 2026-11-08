import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublishedPost, listPublishedPosts } from "@/lib/content";
import { formatDate } from "@/lib/utils";
import { PostCard } from "@/components/post-card";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbLd, orgId, personId } from "@/lib/schema";
import { AUTHOR, siteUrl } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPublishedPost("post", slug);
  if (!post) return {};
  return {
    title: `${post.title} — Lê Bá Tùng`,
    description: post.excerpt ?? undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.cover_url ? [post.cover_url] : undefined,
      publishedTime: post.published_at,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPublishedPost("post", slug);
  if (!post) notFound();
  const others = (await listPublishedPosts(4)).filter((p) => p.slug !== post.slug).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.cover_url ?? undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@id": personId(), "@type": "Person", name: AUTHOR.name, url: `${siteUrl}${AUTHOR.aboutPath}` },
    publisher: { "@id": orgId() },
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
    inLanguage: "vi",
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd([{ name: "Trang chủ", path: "/" }, { name: "Blog", path: "/blog" }, { name: post.title, path: `/blog/${post.slug}` }])} />
      <Link href="/blog" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium">
        <ArrowLeft className="size-4" /> Blog
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">{post.title}</h1>
      <p className="text-muted-foreground mt-3 text-sm">
        <Link href={AUTHOR.aboutPath} className="hover:text-foreground font-medium">{AUTHOR.name}</Link> · {formatDate(post.published_at)}
        {post.updated_at && post.updated_at.slice(0, 10) !== post.published_at.slice(0, 10) && <> · Cập nhật {formatDate(post.updated_at)}</>}
      </p>

      {/* Nội dung do admin soạn — nguồn tin cậy */}
      <article className="post-content mt-8" dangerouslySetInnerHTML={{ __html: post.content_html }} />

      {/* Hộp tác giả — E-E-A-T */}
      <aside className="mt-12 flex gap-4 rounded-xl border p-5">
        <span className="bg-primary text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-full font-bold">LBT</span>
        <div className="text-sm">
          <p className="font-semibold">{AUTHOR.name}</p>
          <p className="text-muted-foreground">{AUTHOR.jobTitle}</p>
          <p className="mt-2 leading-relaxed">{AUTHOR.bio}</p>
          <Link href={AUTHOR.aboutPath} className="text-primary mt-1 inline-block font-medium hover:underline">Xem thêm về tác giả →</Link>
        </div>
      </aside>

      <div className="bg-primary/10 mt-8 rounded-xl p-6 text-center">
        <p className="text-lg font-semibold">Muốn làm được bài bản như trên?</p>
        <p className="text-muted-foreground mt-1 text-sm">Xem các khóa học thực chiến của Lê Bá Tùng.</p>
        <Button asChild className="mt-4"><Link href="/#khoa-hoc">Xem khóa học</Link></Button>
      </div>

      {others.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Bài viết khác</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            {others.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        </section>
      )}
    </main>
  );
}
