"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type GoalType = Database["public"]["Enums"]["goal_type"];

function num(value: FormDataEntryValue | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

export type OnboardingState = { error: string } | null;

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const goalType = (str(formData.get("goal_type")) ?? "maintain") as GoalType;
  const currentWeight = num(formData.get("current_weight_kg"));

  if (currentWeight == null || currentWeight <= 0) {
    return { error: "Please enter your current weight." };
  }

  // 1) Update the profile (created automatically on signup).
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: str(formData.get("display_name")),
      dob: str(formData.get("dob")),
      height_cm: num(formData.get("height_cm")),
      sex: str(formData.get("sex")),
      activity_level: str(formData.get("activity_level")),
    })
    .eq("id", user.id);
  if (profileError) return { error: profileError.message };

  // 2) Create the first (active) goal.
  const { error: goalError } = await supabase.from("goals").insert({
    user_id: user.id,
    type: goalType,
    target_weight_kg: num(formData.get("target_weight_kg")),
    target_date: str(formData.get("target_date")),
    calorie_target: num(formData.get("calorie_target")),
    protein_target_g: num(formData.get("protein_target_g")),
    is_active: true,
  });
  if (goalError) return { error: goalError.message };

  // 3) Log the starting weight.
  const { error: weightError } = await supabase.from("weight_logs").insert({
    user_id: user.id,
    weight_kg: currentWeight,
    note: "Starting weight",
  });
  if (weightError) return { error: weightError.message };

  redirect("/dashboard");
}
