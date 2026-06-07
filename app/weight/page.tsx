import { createClient } from "@/lib/supabase/server";
import { requireUser, getProfile } from "@/lib/auth/user";
import AppNav from "@/components/AppNav";
import WeightChart, { type WeightPoint } from "@/components/WeightChart";
import WeightLogForm from "./WeightLogForm";
import { deleteWeightLog } from "./actions";

export default async function WeightPage() {
  await requireUser();
  const supabase = await createClient();
  const profile = await getProfile();

  const [{ data: logs }, { data: goal }] = await Promise.all([
    supabase
      .from("weight_logs")
      .select("id, logged_at, weight_kg, note")
      .order("logged_at", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("goals")
      .select("target_weight_kg")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const rows = logs ?? [];
  const points: WeightPoint[] = rows.map((r) => ({
    date: r.logged_at,
    weight: Number(r.weight_kg),
  }));
  const target = goal?.target_weight_kg != null ? Number(goal.target_weight_kg) : null;

  const latest = points.at(-1)?.weight ?? null;
  const start = points.at(0)?.weight ?? null;
  const change = latest != null && start != null ? latest - start : null;
  const toTarget = latest != null && target != null ? latest - target : null;

  return (
    <>
      <AppNav tier={profile?.tier} />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Weight tracking
            </h1>
            <p className="mt-1 text-stone-600">
              Log your weight and watch your trend toward your target.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Latest" value={latest != null ? `${latest} kg` : "—"} />
            <Stat
              label="Change since start"
              value={
                change != null
                  ? `${change > 0 ? "+" : ""}${change.toFixed(1)} kg`
                  : "—"
              }
            />
            <Stat
              label="To target"
              value={
                toTarget != null
                  ? `${toTarget > 0 ? "+" : ""}${toTarget.toFixed(1)} kg`
                  : target == null
                    ? "No target"
                    : "—"
              }
            />
          </div>

          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <WeightChart points={points} target={target} />
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-stone-900">Log a weight</h2>
            <WeightLogForm />
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-stone-900">History</h2>
            {rows.length === 0 ? (
              <p className="text-sm text-stone-500">No entries yet.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {[...rows].reverse().map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <div>
                      <span className="font-medium text-stone-900">
                        {Number(r.weight_kg)} kg
                      </span>
                      <span className="ml-3 text-stone-500">
                        {new Date(r.logged_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {r.note && (
                        <span className="ml-3 text-stone-400">{r.note}</span>
                      )}
                    </div>
                    <form action={deleteWeightLog}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        className="text-stone-400 hover:text-red-600"
                        aria-label="Delete entry"
                      >
                        Delete
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-stone-900">{value}</div>
    </div>
  );
}
