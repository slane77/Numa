import { createClient } from "@/lib/supabase/server";
import { requireUser, getProfile } from "@/lib/auth/user";
import AppNav from "@/components/AppNav";
import { Card, PageHeader, EmptyState, DeleteButton } from "@/components/ui";
import GoalForm from "./GoalForm";
import { setActiveGoal, deleteGoal } from "./actions";

const GOAL_LABELS: Record<string, string> = {
  weight_loss: "Lose weight",
  maintain: "Maintain weight",
  weight_gain: "Gain weight",
  event: "Event prep",
};

export default async function GoalsPage() {
  await requireUser();
  const supabase = await createClient();
  const profile = await getProfile();

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

  const rows = goals ?? [];

  return (
    <>
      <AppNav tier={profile?.tier} />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <PageHeader
            title="Goals"
            subtitle="Set what you're working toward. One goal is active at a time and drives your plans."
          />

          <Card title="Your goals">
            {rows.length === 0 ? (
              <EmptyState>No goals yet — add your first below.</EmptyState>
            ) : (
              <ul className="space-y-3">
                {rows.map((g) => (
                  <li
                    key={g.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
                      g.is_active
                        ? "border-brand-200 bg-brand-50"
                        : "border-stone-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900">
                          {GOAL_LABELS[g.type] ?? g.type}
                        </span>
                        {g.is_active && (
                          <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-stone-600">
                        {[
                          g.target_weight_kg != null
                            ? `${g.target_weight_kg} kg`
                            : null,
                          g.calorie_target != null
                            ? `${g.calorie_target} kcal/day`
                            : null,
                          g.protein_target_g != null
                            ? `${g.protein_target_g} g protein/day`
                            : null,
                          g.target_date
                            ? `by ${new Date(g.target_date).toLocaleDateString()}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No targets set"}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {!g.is_active && (
                        <form action={setActiveGoal}>
                          <input type="hidden" name="id" value={g.id} />
                          <button
                            type="submit"
                            className="font-medium text-brand-700 hover:underline"
                          >
                            Make active
                          </button>
                        </form>
                      )}
                      <form action={deleteGoal}>
                        <input type="hidden" name="id" value={g.id} />
                        <DeleteButton />
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Add a goal">
            <GoalForm />
          </Card>
        </div>
      </main>
    </>
  );
}
