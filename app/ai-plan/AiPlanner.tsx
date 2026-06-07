"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";

type PlannedMeal = {
  meal: string;
  title: string;
  servings: number;
  calories: number | null;
  protein_g: number | null;
  uses_pantry_items: string[];
};
type PlannedDay = { date: string; meals: PlannedMeal[] };
type ShoppingItem = {
  item_name: string;
  quantity: number | null;
  unit: string | null;
};
type MealPlanResult = {
  summary: string;
  days: PlannedDay[];
  shopping_list: ShoppingItem[];
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export default function AiPlanner() {
  const [days, setDays] = useState(7);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [fast, setFast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MealPlanResult | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, startDate, fast }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? `Request failed (${res.status}).`);
      }
      setResult(data as MealPlanResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Days
            </span>
            <input
              type="number"
              min={1}
              max={14}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Start date
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="h-[42px] rounded-full bg-brand-600 px-6 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Generating…" : "Generate plan"}
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={fast}
            onChange={(e) => setFast(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300"
          />
          Faster, lower-cost model (less detailed)
        </label>
      </div>

      {loading && (
        <p className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
          Numa is planning your meals around your goal and pantry… this can take
          20–40 seconds.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-brand-700">
              Plan summary
            </h2>
            <p className="text-sm text-stone-700">{result.summary}</p>
          </div>

          {result.days?.map((day) => (
            <div
              key={day.date}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <h3 className="mb-3 font-semibold text-stone-900">
                {new Date(day.date).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </h3>
              <ul className="space-y-3">
                {day.meals?.map((meal, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-stone-100 bg-stone-50 p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                        {MEAL_LABELS[meal.meal] ?? meal.meal}
                      </span>
                      <span className="text-xs text-stone-500">
                        {[
                          meal.calories != null ? `${meal.calories} kcal` : null,
                          meal.protein_g != null
                            ? `${meal.protein_g} g protein`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                    <div className="mt-1 font-medium text-stone-900">
                      {meal.title}
                      {meal.servings > 1 && (
                        <span className="text-stone-400"> ×{meal.servings}</span>
                      )}
                    </div>
                    {meal.uses_pantry_items?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {meal.uses_pantry_items.map((p, j) => (
                          <span
                            key={j}
                            className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700"
                          >
                            uses {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-stone-900">
              Shopping list ({result.shopping_list?.length ?? 0})
            </h3>
            {result.shopping_list?.length ? (
              <ul className="grid gap-1 sm:grid-cols-2">
                {result.shopping_list.map((item, i) => (
                  <li
                    key={i}
                    className="flex justify-between border-b border-stone-100 py-1.5 text-sm"
                  >
                    <span className="text-stone-800">{item.item_name}</span>
                    <span className="text-stone-500">
                      {[item.quantity, item.unit]
                        .filter((v) => v != null && v !== "")
                        .join(" ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-500">
                Nothing to buy — your pantry covers this plan. 🎉
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
