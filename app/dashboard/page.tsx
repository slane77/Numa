import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getProfile } from "@/lib/auth/user";
import AppNav from "@/components/AppNav";

const GOAL_LABELS: Record<string, string> = {
  weight_loss: "Lose weight",
  maintain: "Maintain weight",
  weight_gain: "Gain weight",
  event: "Event prep",
};

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

  // No active goal => user hasn't finished onboarding.
  if (!goal) redirect("/onboarding");

  const [{ data: latestLog }, { count: pantryCount }, { count: prefCount }] =
    await Promise.all([
      supabase
        .from("weight_logs")
        .select("weight_kg, logged_at")
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("inventory")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("food_preferences")
        .select("id", { count: "exact", head: true }),
    ]);

  const isPremium = profile?.tier === "premium";
  const name = profile?.display_name?.split(" ")[0];

  return (
    <>
      <AppNav tier={profile?.tier} />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            {name ? `Welcome back, ${name}` : "Welcome back"}
          </h1>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="Active goal">
              <p className="text-lg font-semibold text-stone-900">
                {GOAL_LABELS[goal.type] ?? goal.type}
              </p>
              <dl className="mt-3 space-y-1 text-sm text-stone-600">
                {goal.target_weight_kg != null && (
                  <Row k="Target weight" v={`${goal.target_weight_kg} kg`} />
                )}
                {goal.target_date && (
                  <Row
                    k="Target date"
                    v={new Date(goal.target_date).toLocaleDateString()}
                  />
                )}
                {goal.calorie_target != null && (
                  <Row k="Daily calories" v={`${goal.calorie_target} kcal`} />
                )}
                {goal.protein_target_g != null && (
                  <Row k="Daily protein" v={`${goal.protein_target_g} g`} />
                )}
              </dl>
            </Card>

            <Card title="Latest weight">
              {latestLog ? (
                <>
                  <p className="text-lg font-semibold text-stone-900">
                    {Number(latestLog.weight_kg)} kg
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    Logged{" "}
                    {new Date(latestLog.logged_at).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <p className="text-sm text-stone-500">No weigh-ins yet.</p>
              )}
              <Link
                href="/weight"
                className="mt-4 inline-block rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Track weight
              </Link>
            </Card>
          </div>

          {/* Quick links to manage the inputs that drive planning */}
          <Card title="Set up your plan">
            <div className="grid gap-3 sm:grid-cols-3">
              <QuickLink
                href="/goals"
                title="Goals"
                detail="Manage targets"
              />
              <QuickLink
                href="/pantry"
                title="Pantry"
                detail={`${pantryCount ?? 0} item${pantryCount === 1 ? "" : "s"}`}
              />
              <QuickLink
                href="/preferences"
                title="Preferences"
                detail={`${prefCount ?? 0} set`}
              />
            </div>
          </Card>

          {/* AI meal planning — premium gated */}
          <Card title="AI meal planning">
            {isPremium ? (
              <>
                <p className="text-sm text-stone-600">
                  Generate a pantry-aware plan that uses what you already have
                  and lists only what&apos;s missing.
                </p>
                <Link
                  href="/ai-plan"
                  className="mt-4 inline-block rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Generate AI plan
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-stone-600">
                  Pantry intelligence, AI meal planning, goal forecasting and
                  advanced shopping optimisation are part of Numa Premium.
                </p>
                <Link
                  href="/ai-plan"
                  className="mt-4 inline-block rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
                >
                  Learn more
                </Link>
              </>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}

function QuickLink({
  href,
  title,
  detail,
}: {
  href: string;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-stone-200 p-4 transition hover:border-brand-300 hover:bg-brand-50"
    >
      <div className="font-medium text-stone-900">{title}</div>
      <div className="mt-0.5 text-sm text-stone-500">{detail}</div>
    </Link>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt>{k}</dt>
      <dd className="font-medium text-stone-800">{v}</dd>
    </div>
  );
}
