import { PostCard } from "@/components/post-card";
import { listPublishedPosts } from "@/lib/content";

export const metadata = {
  title: "Blog — Học viện Lê Bá Tùng",
  description: "Kiến thức quảng cáo Facebook, marketing online và tư duy kinh doanh từ Lê Bá Tùng.",
};

export default async function BlogPage() {
  const posts = await listPublishedPosts();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
      <p className="text-muted-foreground mt-2">Kiến thức quảng cáo & marketing online thực chiến.</p>

      {posts.length === 0 ? (
        <p className="text-muted-foreground mt-8 text-sm">Chưa có bài viết nào.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </main>
  );
}
