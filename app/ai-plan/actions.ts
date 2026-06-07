"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MealPlanResult } from "@/lib/ai/mealPlan";
import type { Database } from "@/lib/types/database";

type MealType = Database["public"]["Enums"]["meal_type"];
const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const norm = (s: string) => s.trim().toLowerCase();

export type SaveResult = { error: string } | { planId: string };

/**
 * Persists an AI-generated plan as editable data:
 * - a meal_plan spanning the generated dates
 * - one recipe per distinct AI meal (so the meals show up in the planner and
 *   can be edited / reused later; ingredients can be filled in afterwards)
 * - meal_plan_items linking days/slots to those recipes
 * - a shopping_list with the AI's "what's missing" items
 */
export async function saveAiPlan(result: MealPlanResult): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const days = Array.isArray(result?.days) ? result.days : [];
  const dates = days
    .map((d) => d.date)
    .filter((d): d is string => typeof d === "string" && d !== "")
    .sort();
  if (dates.length === 0) {
    return { error: "There's no plan to save — generate one first." };
  }
  const start = dates[0];
  const end = dates[dates.length - 1];

  // 1) Create the meal plan.
  const { data: plan, error: planError } = await supabase
    .from("meal_plans")
    .insert({
      user_id: user.id,
      title: `AI plan — ${new Date(start).toLocaleDateString("en-GB")}`,
      start_date: start,
      end_date: end,
      status: "active",
    })
    .select("id")
    .single();
  if (planError || !plan) {
    return { error: planError?.message ?? "Couldn't create the plan." };
  }

  // 2) One recipe per distinct meal title.
  const distinct = new Map<
    string,
    { title: string; calories: number | null; protein: number | null }
  >();
  for (const day of days) {
    for (const meal of day.meals ?? []) {
      if (!meal?.title) continue;
      const key = norm(meal.title);
      if (!distinct.has(key)) {
        distinct.set(key, {
          title: meal.title,
          calories: meal.calories ?? null,
          protein: meal.protein_g ?? null,
        });
      }
    }
  }

  const recipeIdByTitle = new Map<string, string>();
  if (distinct.size > 0) {
    const { data: created, error: recipeError } = await supabase
      .from("recipes")
      .insert(
        [...distinct.values()].map((m) => ({
          user_id: user.id,
          title: m.title,
          servings: 1,
          calories_per_serving: m.calories,
          protein_g: m.protein,
          source: "Numa AI",
        })),
      )
      .select("id, title");
    if (recipeError) return { error: recipeError.message };
    for (const r of created ?? []) recipeIdByTitle.set(norm(r.title), r.id);
  }

  // 3) Meal plan items.
  const items: {
    meal_plan_id: string;
    day: string;
    meal: MealType;
    recipe_id: string | null;
    servings: number;
  }[] = [];
  for (const day of days) {
    if (!day.date) continue;
    for (const meal of day.meals ?? []) {
      const mealType = meal?.meal as MealType;
      if (!MEALS.includes(mealType)) continue;
      items.push({
        meal_plan_id: plan.id,
        day: day.date,
        meal: mealType,
        recipe_id: meal.title ? (recipeIdByTitle.get(norm(meal.title)) ?? null) : null,
        servings: meal.servings && meal.servings > 0 ? meal.servings : 1,
      });
    }
  }
  if (items.length > 0) {
    await supabase.from("meal_plan_items").insert(items);
  }

  // 4) Shopping list from the AI's "what's missing" output.
  const shopping = Array.isArray(result.shopping_list)
    ? result.shopping_list
    : [];
  if (shopping.length > 0) {
    const { data: list } = await supabase
      .from("shopping_lists")
      .insert({
        user_id: user.id,
        meal_plan_id: plan.id,
        title: `Shopping — AI plan`,
        status: "open",
      })
      .select("id")
      .single();
    if (list) {
      await supabase.from("shopping_list_items").insert(
        shopping
          .filter((s) => s?.item_name)
          .map((s) => ({
            shopping_list_id: list.id,
            item_name: s.item_name,
            quantity: s.quantity ?? null,
            unit: s.unit ?? null,
            have_in_pantry: false,
            purchased: false,
          })),
      );
    }
  }

  return { planId: plan.id };
}
