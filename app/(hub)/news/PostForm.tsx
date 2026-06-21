"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import MediaUpload from "@/components/MediaUpload";
import { NEWS_CATEGORIES } from "@/lib/news";
import type { PostActionState } from "./actions";
import type { Tables } from "@/lib/types/database";

type Action = (
  state: PostActionState,
  form: FormData,
) => Promise<PostActionState>;

const inputClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-brand-600 px-6 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export default function PostForm({
  action,
  post,
  submitLabel = "Publish",
}: {
  action: Action;
  post?: Tables<"news_posts">;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<PostActionState, FormData>(
    action,
    null,
  );
  const [cover, setCover] = useState(post?.cover_image_url ?? "");

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Title
        </span>
        <input
          name="title"
          required
          defaultValue={post?.title ?? ""}
          placeholder="e.g. Summer staff social — save the date!"
          className={`${inputClass} text-lg`}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Category
          </span>
          <select
            name="category"
            defaultValue={post?.category ?? "General"}
            className={inputClass}
          >
            {NEWS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-4 pb-1">
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="is_pinned"
              defaultChecked={post?.is_pinned ?? false}
              className="h-4 w-4 rounded border-stone-300"
            />
            Pin to top
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="published"
              defaultChecked={post?.published ?? true}
              className="h-4 w-4 rounded border-stone-300"
            />
            Published
          </label>
        </div>
      </div>

      <MediaUpload value={cover} onChange={setCover} folder="news" />
      <input type="hidden" name="cover_image_url" value={cover} />

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Post
        </span>
        <textarea
          name="body"
          required
          rows={10}
          defaultValue={post?.body ?? ""}
          placeholder="Write your update here. Leave a blank line between paragraphs."
          className={`${inputClass} resize-y leading-relaxed`}
        />
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <SaveButton label={submitLabel} />
      </div>
    </form>
  );
}
