"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deriveExcerpt } from "@/lib/news";

export type PostActionState = { error: string } | null;

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Shared validation/shape for create + update. */
function readPost(form: FormData) {
  const title = str(form, "title");
  const body = str(form, "body");
  const category = str(form, "category") || "General";
  const cover = str(form, "cover_image_url");
  const excerpt = str(form, "excerpt");
  const is_pinned = form.get("is_pinned") === "on";
  const published = form.get("published") !== "off"; // default published

  return {
    title,
    body,
    category,
    cover_image_url: cover || null,
    excerpt: excerpt || deriveExcerpt(body),
    is_pinned,
    published,
  };
}

export async function createPost(
  _prev: PostActionState,
  form: FormData,
): Promise<PostActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const post = readPost(form);
  if (!post.title) return { error: "Give your post a title." };
  if (!post.body) return { error: "Write something in the post body." };

  const { data, error } = await supabase
    .from("news_posts")
    .insert({ ...post, author_id: user.id })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/home");
  revalidatePath("/news");
  redirect(`/news/${data.id}`);
}

export async function updatePost(
  id: string,
  _prev: PostActionState,
  form: FormData,
): Promise<PostActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const post = readPost(form);
  if (!post.title) return { error: "Give your post a title." };
  if (!post.body) return { error: "Write something in the post body." };

  // RLS scopes this to the author / admins.
  const { error } = await supabase.from("news_posts").update(post).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/home");
  revalidatePath("/news");
  revalidatePath(`/news/${id}`);
  redirect(`/news/${id}`);
}

export async function deletePost(form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(form.get("id"));
  if (id) {
    await supabase.from("news_posts").delete().eq("id", id);
  }
  revalidatePath("/home");
  revalidatePath("/news");
  redirect("/news");
}
