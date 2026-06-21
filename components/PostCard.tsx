import Link from "next/link";
import { categoryClass, formatRelative, deriveExcerpt } from "@/lib/news";
import type { Tables } from "@/lib/types/database";

export type PostWithAuthor = Tables<"news_posts"> & { authorName?: string };

/** A single news post preview, used on the home feed and the news index. */
export default function PostCard({
  post,
  featured = false,
}: {
  post: PostWithAuthor;
  featured?: boolean;
}) {
  const excerpt = post.excerpt || deriveExcerpt(post.body);

  return (
    <Link
      href={`/news/${post.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-card transition-shadow hover:shadow-lg"
    >
      {post.cover_image_url && (
        <div
          className={`overflow-hidden bg-stone-100 ${featured ? "h-56" : "h-40"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryClass(
              post.category,
            )}`}
          >
            {post.category}
          </span>
          {post.is_pinned && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              📌 Pinned
            </span>
          )}
          {!post.published && (
            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">
              Draft
            </span>
          )}
        </div>
        <h3
          className={`font-semibold text-stone-900 group-hover:text-brand-700 ${
            featured ? "text-xl" : "text-base"
          }`}
        >
          {post.title}
        </h3>
        {excerpt && (
          <p className="mt-1 line-clamp-2 text-sm text-stone-600">{excerpt}</p>
        )}
        <p className="mt-3 text-xs text-stone-400">
          {post.authorName ? `${post.authorName} · ` : ""}
          {formatRelative(post.published_at)}
        </p>
      </div>
    </Link>
  );
}
