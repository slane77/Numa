import { createClient } from "@/lib/supabase/server";
import type { PostWithAuthor } from "@/components/PostCard";
import type { Tables } from "@/lib/types/database";

/**
 * Attach author display names to a set of posts. `news_posts.author_id`
 * references auth.users (not public.profiles), so PostgREST can't auto-join —
 * we resolve names in one extra query and map them on.
 */
async function withAuthors(
  posts: Tables<"news_posts">[],
): Promise<PostWithAuthor[]> {
  const ids = [...new Set(posts.map((p) => p.author_id).filter(Boolean))];
  if (ids.length === 0) return posts;

  const supabase = await createClient();
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ids as string[]);

  const names = new Map(
    (authors ?? []).map((a) => [a.id, a.display_name ?? undefined]),
  );
  return posts.map((p) => ({
    ...p,
    authorName: p.author_id ? names.get(p.author_id) : undefined,
  }));
}

/** Latest posts for the feed (newest first, pinned surfaced separately). */
export async function getFeedPosts(limit = 20): Promise<PostWithAuthor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news_posts")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit);
  return withAuthors(data ?? []);
}

/** A single post plus its author name, or null if not found/visible. */
export async function getPost(id: string): Promise<PostWithAuthor | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const [withName] = await withAuthors([data]);
  return withName;
}
