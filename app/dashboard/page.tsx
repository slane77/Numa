import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getProfile } from "@/lib/auth/user";
import AppNav from "@/components/AppNav";
import WeightChart, { type WeightPoint } from "@/components/WeightChart";
import ProgressRing from "@/components/ProgressRing";

const GOAL_LABELS: Record<string, string> = {
  weight_loss: "Lose weight",
  maintain: "Maintain weight",
  weight_gain: "Gain weight",
  event: "Event prep",
};

const QUICK_ACTIONS = [
  { href: "/plans", emoji: "📅", label: "Meal plans", key: "plans" },
  { href: "/recipes", emoji: "📖", label: "Recipes", key: "recipes" },
  { href: "/shopping", emoji: "🛒", label: "Shopping", key: "shopping" },
  { href: "/pantry", emoji: "🧊", label: "Pantry", key: "pantry" },
  { href: "/preferences", emoji: "🍽️", label: "Preferences", key: "prefs" },
  { href: "/chat", emoji: "✨", label: "Taste chat", key: "chat" },
] as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const profile = await getProfile();

  const { data: goal } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // No active goal => onboarding not finished.
  if (!goal) redirect("/onboarding");

  const [
    { data: logs },
    { count: recipes },
    { count: plans },
    { count: shopping },
    { count: pantry },
    { count: prefs },
  ] = await Promise.all([
    supabase
      .from("weight_logs")
      .select("logged_at, weight_kg")
      .order("logged_at", { ascending: true }),
    supabase.from("recipes").select("id", { count: "exact", head: true }),
    supabase.from("meal_plans").select("id", { count: "exact", head: true }),
    supabase
      .from("shopping_lists")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase.from("inventory").select("id", { count: "exact", head: true }),
    supabase
      .from("food_preferences")
      .select("id", { count: "exact", head: true }),
  ]);

  const counts: Record<string, number> = {
    recipes: recipes ?? 0,
    plans: plans ?? 0,
    shopping: shopping ?? 0,
    pantry: pantry ?? 0,
    prefs: prefs ?? 0,
    chat: 0,
  };

  const points: WeightPoint[] = (logs ?? []).map((l) => ({
    date: l.logged_at,
    weight: Number(l.weight_kg),
  }));
  const start = points.at(0)?.weight ?? null;
  const latest = points.at(-1)?.weight ?? null;
  const target =
    goal.target_weight_kg != null ? Number(goal.target_weight_kg) : null;
  const change = latest != null && start != null ? latest - start : null;
  const toTarget = latest != null && target != null ? latest - target : null;

  // Progress toward target weight (for loss/gain goals with a target set).
  let progressPct = 0;
  let reached = false;
  if (start != null && latest != null && target != null) {
    const total = Math.abs(start - target);
    const done =
      goal.type === "weight_gain" ? latest - start : start - latest;
    progressPct = total > 0 ? (done / total) * 100 : latest === target ? 100 : 0;
    reached =
      goal.type === "weight_gain" ? latest >= target : latest <= target;
    if (reached) progressPct = 100;
  }

  const name = profile?.display_name?.split(" ")[0];
  const isPremium = profile?.tier === "premium";

  const statusLine = reached
    ? "Goal reached — nice work! 🎉"
    : toTarget != null
      ? `${Math.abs(toTarget).toFixed(1)} kg to your target`
      : "Let's plan something good today.";

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <AppNav tier={profile?.tier} />
      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-b from-brand-50 to-stone-50">
          <div className="mx-auto max-w-4xl px-4 pb-6 pt-8">
            <p className="text-sm text-stone-500">{today}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              {name ? `Welcome back, ${name}` : "Welcome back"}
            </h1>
            <p className="mt-1 text-stone-600">{statusLine}</p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Latest" value={latest != null ? `${latest}` : "—"} unit="kg" />
            <Stat
              label="Change"
              value={
                change != null
                  ? `${change > 0 ? "+" : ""}${change.toFixed(1)}`
                  : "—"
              }
              unit="kg"
            />
            <Stat
              label="To target"
              value={
                toTarget != null ? `${Math.abs(toTarget).toFixed(1)}` : "—"
              }
              unit={toTarget != null ? "kg" : ""}
            />
            <Stat label="Weigh-ins" value={`${points.length}`} unit="" />
          </div>

          {/* Goal + trend */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-card">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-500">
                Active goal
              </h2>
              <div className="flex items-center gap-5">
                <ProgressRing percent={progressPct}>
                  <span className="text-xl font-bold text-stone-900">
                    {target != null ? `${Math.round(progressPct)}%` : "—"}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {target != null ? "to goal" : "no target"}
                  </span>
                </ProgressRing>
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-stone-900">
                    {GOAL_LABELS[goal.type] ?? goal.type}
                  </p>
                  <dl className="mt-2 space-y-1 text-sm text-stone-600">
                    {target != null && <Row k="Target" v={`${target} kg`} />}
                    {goal.calorie_target != null && (
                      <Row k="Calories" v={`${goal.calorie_target}/day`} />
                    )}
                    {goal.protein_target_g != null && (
                      <Row k="Protein" v={`${goal.protein_target_g} g/day`} />
                    )}
                  </dl>
                  <Link
                    href="/goals"
                    className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline"
                  >
                    Manage goals →
                  </Link>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Weight trend
                </h2>
                <Link
                  href="/weight"
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  Log weight →
                </Link>
              </div>
              <WeightChart points={points} target={target} />
            </section>
          </div>

          {/* AI meal planning */}
          <section className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-md">
                <h2 className="font-semibold text-stone-900">
                  ✨ AI meal planning
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  {isPremium
                    ? "Generate a pantry-aware plan around your goal — using what you have and listing only what's missing."
                    : "Pantry intelligence and AI meal planning are part of Numa Premium."}
                </p>
              </div>
              <Link
                href={isPremium ? "/ai-plan" : "/billing"}
                className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                {isPremium ? "Generate plan" : "Upgrade — £4.99/mo"}
              </Link>
            </div>
          </section>

          {/* Quick actions */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Quick actions
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-card transition hover:border-brand-300 hover:bg-brand-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-xl">
                    {a.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-stone-900">
                      {a.label}
                    </span>
                    {counts[a.key] > 0 && (
                      <span className="block text-sm text-stone-500">
                        {counts[a.key]}{" "}
                        {a.key === "shopping" ? "open" : "saved"}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-stone-900">
        {value}
        {unit && <span className="ml-1 text-sm text-stone-400">{unit}</span>}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{k}</dt>
      <dd className="font-medium text-stone-800">{v}</dd>
    </div>
  );
}
