import Link from "next/link";
import { redirect } from "next/navigation";
import { isEditor } from "@/lib/auth/user";
import PostForm from "../PostForm";
import { createPost } from "../actions";

export const metadata = { title: "New post — The Hub" };

export default async function NewPostPage() {
  // Only editors/admins can publish. RLS enforces this too, but redirect early
  // so non-editors never see the form.
  if (!(await isEditor())) redirect("/news");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/news"
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          ← Back to news
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
          Write a post
        </h1>
      </div>
      <PostForm action={createPost} submitLabel="Publish" />
    </div>
  );
}
