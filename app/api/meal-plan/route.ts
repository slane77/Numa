import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePremium, PremiumRequiredError } from "@/lib/auth/requirePremium";
import { generateMealPlan } from "@/lib/ai/mealPlan";
import { enforceRateLimit } from "@/lib/ai/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/meal-plan
 * Premium-only. Generates a pantry-aware, goal-aligned meal plan + shopping list.
 *
 * Body (all optional): { days?: number; startDate?: string; fast?: boolean }
 */
export async function POST(request: NextRequest) {
  // 1) Premium gate (also rejects unauthenticated users).
  let userId: string;
  try {
    const profile = await requirePremium();
    userId = profile.id;
  } catch (err) {
    if (err instanceof PremiumRequiredError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  // 2) Parse request.
  const body = await request.json().catch(() => ({}));
  const days = Math.min(Math.max(Number(body?.days) || 7, 1), 14);
  const startDate =
    typeof body?.startDate === "string" && body.startDate
      ? body.startDate
      : new Date().toISOString().slice(0, 10);
  const fast = Boolean(body?.fast);

  const supabase = await createClient();

  // 2b) Rate limit to protect AI spend (per user, rolling 24h).
  const limit = await enforceRateLimit(
    supabase,
    userId,
    "meal_plan",
    25,
    24 * 60 * 60 * 1000,
  );
  if (!limit.ok) {
    return NextResponse.json(
      {
        error:
          "You've reached today's AI meal-plan limit. Please try again tomorrow.",
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  // 3) Gather inputs (RLS scopes every query to this user).
  const [goalRes, prefsRes, pantryRes, recipesRes] = await Promise.all([
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("food_preferences")
      .select("kind, value, severity")
      .eq("user_id", userId),
    supabase
      .from("inventory")
      .select("item_name, quantity, unit, expires_at")
      .eq("user_id", userId)
      .order("expires_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("recipes")
      .select("id, title, calories_per_serving, protein_g")
      .or(`user_id.eq.${userId},is_public.eq.true`),
  ]);

  // 4) Generate.
  try {
    const plan = await generateMealPlan(
      {
        goal: goalRes.data ?? null,
        preferences: prefsRes.data ?? [],
        pantry: pantryRes.data ?? [],
        recipes: recipesRes.data ?? [],
        days,
        startDate,
      },
      { fast },
    );
    return NextResponse.json(plan);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate meal plan.";
    // Missing API key is a config (server) error; surface clearly.
    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
