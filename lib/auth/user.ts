import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database";

export type Profile = Tables<"profiles">;

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
 * Returns the current user's profile row (or null if not signed in / not created yet).
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

/**
 * True when the signed-in user is on the premium tier.
 */
export async function isPremium(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.tier === "premium";
}
