import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getProfile } from "@/lib/auth/user";
import AppNav from "@/components/AppNav";
import { Card } from "@/components/ui";
import AddItemForm from "./AddItemForm";
import { deletePlan, deletePlanItem } from "../actions";
import { generateShoppingList } from "@/app/shopping/actions";
import type { Database } from "@/lib/types/database";

type MealType = Database["public"]["Enums"]["meal_type"];
const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

type Recipe = {
  title: string;
  calories_per_serving: number | null;
  protein_g: number | null;
};
type Item = {
  id: string;
  day: string;
  meal: MealType;
  servings: number;
  recipe_id: string | null;
  recipes: Recipe | null;
};

function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

const PLAN_ERRORS: Record<string, string> = {
  empty: "Add at least one meal before generating a shopping list.",
  no_ingredients:
    "The recipes in this plan have no ingredients, so there's nothing to shop for.",
  list_failed: "Couldn't create the shopping list. Please try again.",
};

export default async function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { error: errorKey } = await searchParams;
  const supabase = await createClient();
  const profile = await getProfile();

  const { data: plan } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!plan) notFound();

  const [{ data: itemsData }, { data: recipesData }] = await Promise.all([
    supabase
      .from("meal_plan_items")
      .select(
        "id, day, meal, servings, recipe_id, recipes(title, calories_per_serving, protein_g)",
      )
      .eq("meal_plan_id", id),
    supabase
      .from("recipes")
      .select("id, title")
      .order("title", { ascending: true }),
  ]);

  const items = (itemsData ?? []) as unknown as Item[];
  const recipes = recipesData ?? [];
  const days = eachDay(plan.start_date, plan.end_date);

  const itemsFor = (day: string, meal: MealType) =>
    items.filter((it) => it.day === day && it.meal === meal);

  const dayTotals = (day: string) =>
    items
      .filter((it) => it.day === day)
      .reduce(
        (acc, it) => {
          const cal = it.recipes?.calories_per_serving ?? 0;
          const pro = it.recipes?.protein_g ?? 0;
          acc.calories += cal * it.servings;
          acc.protein += Number(pro) * it.servings;
          return acc;
        },
        { calories: 0, protein: 0 },
      );

  return (
    <>
      <AppNav tier={profile?.tier} />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <Link href="/plans" className="text-sm text-brand-700 hover:underline">
            ← All plans
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                {plan.title || "Untitled plan"}
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                {new Date(plan.start_date).toLocaleDateString()} –{" "}
                {new Date(plan.end_date).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <form action={generateShoppingList}>
                <input type="hidden" name="meal_plan_id" value={plan.id} />
                <button
                  type="submit"
                  className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Generate shopping list
                </button>
              </form>
              <form action={deletePlan}>
                <input type="hidden" name="id" value={plan.id} />
                <button
                  type="submit"
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:border-red-300 hover:text-red-600"
                >
                  Delete plan
                </button>
              </form>
            </div>
          </div>

          {errorKey && PLAN_ERRORS[errorKey] && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {PLAN_ERRORS[errorKey]}
            </p>
          )}

          <Card title="Add a meal">
            <AddItemForm planId={plan.id} days={days} recipes={recipes} />
          </Card>

          <div className="space-y-4">
            {days.map((day) => {
              const totals = dayTotals(day);
              return (
                <Card key={day}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h2 className="font-semibold text-stone-900">
                      {new Date(day).toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </h2>
                    <span className="text-sm text-stone-500">
                      {Math.round(totals.calories)} kcal ·{" "}
                      {Math.round(totals.protein)} g protein
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {MEAL_ORDER.map((meal) => {
                      const slot = itemsFor(day, meal);
                      return (
                        <div
                          key={meal}
                          className="rounded-xl border border-stone-200 p-3"
                        >
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
                            {MEAL_LABELS[meal]}
                          </div>
                          {slot.length === 0 ? (
                            <p className="text-sm text-stone-300">—</p>
                          ) : (
                            <ul className="space-y-2">
                              {slot.map((it) => (
                                <li
                                  key={it.id}
                                  className="flex items-start justify-between gap-2 text-sm"
                                >
                                  <span className="text-stone-800">
                                    {it.recipes?.title ?? "Recipe"}
                                    {it.servings > 1 && (
                                      <span className="text-stone-400">
                                        {" "}
                                        ×{it.servings}
                                      </span>
                                    )}
                                  </span>
                                  <form action={deletePlanItem}>
                                    <input
                                      type="hidden"
                                      name="id"
                                      value={it.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="meal_plan_id"
                                      value={plan.id}
                                    />
                                    <button
                                      type="submit"
                                      aria-label="Remove"
                                      className="text-stone-300 hover:text-red-600"
                                    >
                                      ×
                                    </button>
                                  </form>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
