import "server-only";
import { createPublicSupabase } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { PostRow, ReviewRow } from "@/lib/types";

const POST_LIST_COLUMNS = "id, kind, slug, title, excerpt, cover_url, category, published_at, updated_at";

/** Bài blog đã đăng, mới nhất trước */
export async function listPublishedPosts(limit?: number): Promise<Omit<PostRow, "content_html" | "is_published">[]> {
  if (!isSupabaseConfigured) return [];
  let q = createPublicSupabase()
    .from("posts")
    .select(POST_LIST_COLUMNS)
    .eq("kind", "post")
    .order("published_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Omit<PostRow, "content_html" | "is_published">[];
}

/** 1 bài blog / trang tĩnh đã đăng (RLS tự ẩn bài nháp) */
export async function getPublishedPost(kind: PostRow["kind"], slug: string): Promise<PostRow | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await createPublicSupabase()
    .from("posts")
    .select("*")
    .eq("kind", kind)
    .eq("slug", slug)
    .maybeSingle();
  return (data as PostRow) ?? null;
}

/** Cảm nhận nổi bật cho trang chủ */
export async function listFeaturedReviews(): Promise<ReviewRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await createPublicSupabase()
    .from("reviews")
    .select("*")
    .eq("is_featured", true)
    .order("position");
  return (data ?? []) as ReviewRow[];
}

export async function listCourseReviews(courseId: string): Promise<ReviewRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await createPublicSupabase()
    .from("reviews")
    .select("*")
    .eq("course_id", courseId)
    .order("position");
  return (data ?? []) as ReviewRow[];
}
