"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type MealType = Database["public"]["Enums"]["meal_type"];
const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function str(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

export type PlanActionState = { error: string } | null;

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function createPlan(
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const { supabase, userId } = await getUserId();

  const start = str(formData.get("start_date"));
  const end = str(formData.get("end_date"));
  if (!start || !end) return { error: "Pick a start and end date." };
  if (end < start) return { error: "End date can't be before the start date." };

  const { data: plan, error } = await supabase
    .from("meal_plans")
    .insert({
      user_id: userId,
      title: str(formData.get("title")),
      start_date: start,
      end_date: end,
      status: "active",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/plans");
  redirect(`/plans/${plan.id}`);
}

export async function deletePlan(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const id = String(formData.get("id"));
  if (id) {
    await supabase.from("meal_plans").delete().eq("id", id).eq("user_id", userId);
  }
  revalidatePath("/plans");
  redirect("/plans");
}

export async function addPlanItem(
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const { supabase } = await getUserId();

  const planId = str(formData.get("meal_plan_id"));
  const day = str(formData.get("day"));
  const meal = str(formData.get("meal")) as MealType | null;
  const recipeId = str(formData.get("recipe_id"));
  const servings = Number(formData.get("servings")) || 1;

  if (!planId || !day || !meal || !MEALS.includes(meal)) {
    return { error: "Choose a day, meal and recipe." };
  }
  // RLS ensures the plan and recipe belong to (or are visible to) the user.
  const { error } = await supabase.from("meal_plan_items").insert({
    meal_plan_id: planId,
    day,
    meal,
    recipe_id: recipeId,
    servings,
  });
  if (error) return { error: error.message };

  revalidatePath(`/plans/${planId}`);
  return null;
}

export async function deletePlanItem(formData: FormData) {
  const { supabase } = await getUserId();
  const id = String(formData.get("id"));
  const planId = String(formData.get("meal_plan_id"));
  if (id) {
    await supabase.from("meal_plan_items").delete().eq("id", id);
  }
  if (planId) revalidatePath(`/plans/${planId}`);
}
