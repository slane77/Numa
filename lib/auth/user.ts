import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database";

export type Profile = Tables<"profiles">;
export type Role = Profile["role"];

/**
 * Returns the current authenticated user, or null. Safe in any server context.
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns the current user or redirects to /login. Use to gate private pages.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Returns the current user's profile row (or null if not signed in).
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data;
}

/** True when the signed-in user can publish content (editor or admin). */
export async function isEditor(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "editor" || profile?.role === "admin";
}

/** True when the signed-in user is an admin. */
export async function isAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "admin";
}

/** True when the signed-in user has HR access (HR flag, or an admin). */
export async function isHr(): Promise<boolean> {
  const profile = await getProfile();
  return !!profile?.is_hr || profile?.role === "admin";
}

/** Friendly first name for greetings. Falls back to the email handle. */
export function firstName(
  profile: Pick<Profile, "display_name"> | null,
  email?: string | null,
): string {
  const name = profile?.display_name?.trim() || email?.split("@")[0] || "there";
  return name.split(" ")[0];
}
