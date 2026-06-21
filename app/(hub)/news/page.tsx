import Link from "next/link";
import { getFeedPosts } from "@/lib/posts";
import { isEditor } from "@/lib/auth/user";
import PostCard from "@/components/PostCard";

export const metadata = { title: "News — The Hub" };

export default async function NewsPage() {
  const [posts, canPost] = await Promise.all([getFeedPosts(50), isEditor()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Company news
          </h1>
          <p className="mt-1 text-stone-600">
            Announcements, updates and goings-on across Day Webster.
          </p>
        </div>
        {canPost && (
          <Link
            href="/news/new"
            className="shrink-0 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            ✏️ New post
          </Link>
        )}
      </div>

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center text-stone-600">
          No news yet.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
