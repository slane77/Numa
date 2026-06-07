import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/**
 * Simple per-user sliding-window rate limit backed by the `usage_events` table.
 *
 * Counts the user's events for `feature` within the window; if under `max`,
 * records a new event and allows the request. Good enough to protect AI spend
 * at current scale — at very high volume this counter should move to Redis.
 */
export async function enforceRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
  feature: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - windowMs).toISOString();

  const { count } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .gte("created_at", since);

  if ((count ?? 0) >= max) {
    return { ok: false, retryAfterSec: Math.ceil(windowMs / 1000) };
  }

  await supabase.from("usage_events").insert({ user_id: userId, feature });
  return { ok: true };
}
