import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/posts";
import { getUser, isAdmin } from "@/lib/auth/user";
import { categoryClass, formatDate } from "@/lib/news";
import { deletePost } from "../actions";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post, user, admin] = await Promise.all([
    getPost(id),
    getUser(),
    isAdmin(),
  ]);
  if (!post) notFound();

  const canManage = admin || (!!user && post.author_id === user.id);
  const isVideo = post.cover_image_url
    ? /\.(mp4|webm|mov)$/i.test(post.cover_image_url)
    : false;

  const paragraphs = post.body.split(/\n{2,}/).filter((p) => p.trim());

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link href="/news" className="text-sm text-stone-500 hover:text-stone-800">
        ← Back to news
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryClass(
              post.category,
            )}`}
          >
            {post.category}
          </span>
          {post.is_pinned && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              📌 Pinned
            </span>
          )}
          {!post.published && (
            <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-600">
              Draft
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          {post.title}
        </h1>
        <p className="text-sm text-stone-500">
          {post.authorName ? `${post.authorName} · ` : ""}
          {formatDate(post.published_at)}
        </p>
      </header>

      {post.cover_image_url &&
        (isVideo ? (
          <video
            src={post.cover_image_url}
            controls
            className="w-full rounded-2xl bg-black"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image_url}
            alt=""
            className="w-full rounded-2xl object-cover"
          />
        ))}

      <div className="prose-hub max-w-none text-stone-800">
        {paragraphs.map((para, i) => (
          <p key={i}>
            {para.split("\n").map((line, j) => (
              <span key={j}>
                {line}
                {j < para.split("\n").length - 1 && <br />}
              </span>
            ))}
          </p>
        ))}
      </div>

      {canManage && (
        <div className="flex items-center gap-3 border-t border-stone-200 pt-5">
          <Link
            href={`/news/${post.id}/edit`}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-400"
          >
            Edit
          </Link>
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <button
              type="submit"
              className="rounded-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
