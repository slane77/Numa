import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPost } from "@/lib/posts";
import { getUser, isAdmin } from "@/lib/auth/user";
import PostForm from "../../PostForm";
import { updatePost } from "../../actions";

export default async function EditPostPage({
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
  if (!canManage) redirect(`/news/${id}`);

  // Bind the post id so PostForm can call a (state, formData) action.
  const action = updatePost.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/news/${id}`}
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          ← Back to post
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
          Edit post
        </h1>
      </div>
      <PostForm action={action} post={post} submitLabel="Save changes" />
    </div>
  );
}
