import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export function PostCard({
  post,
}: {
  post: { slug: string; title: string; excerpt: string | null; cover_url: string | null; published_at: string };
}) {
  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link href={`/blog/${post.slug}`} className="bg-muted relative block aspect-[5/3]">
        {post.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover_url} alt={post.title} loading="lazy" className="absolute inset-0 size-full object-cover" />
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-muted-foreground text-xs">{formatDate(post.published_at)}</p>
        <h2 className="mt-1.5 line-clamp-2 font-semibold tracking-tight">
          <Link href={`/blog/${post.slug}`} className="hover:text-primary">{post.title}</Link>
        </h2>
        {post.excerpt && <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">{post.excerpt}</p>}
      </div>
    </Card>
  );
}
