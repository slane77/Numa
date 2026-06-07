"use server";

import { revalidatePath } from "next/cache";
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

export type GoalActionState = { error: string } | { ok: true } | null;

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function createGoal(
  _prev: GoalActionState,
  formData: FormData,
): Promise<GoalActionState> {
  const { supabase, userId } = await getUserId();

  const type = (str(formData.get("type")) ?? "maintain") as GoalType;

  // Insert the new goal as active, then deactivate every other goal so there is
  // always exactly one active goal (and never a window with none active).
  const { data: inserted, error } = await supabase
    .from("goals")
    .insert({
      user_id: userId,
      type,
      target_weight_kg: num(formData.get("target_weight_kg")),
      target_date: str(formData.get("target_date")),
      calorie_target: num(formData.get("calorie_target")),
      protein_target_g: num(formData.get("protein_target_g")),
      is_active: true,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase
    .from("goals")
    .update({ is_active: false })
    .eq("user_id", userId)
    .neq("id", inserted.id);

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setActiveGoal(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const id = String(formData.get("id"));
  if (!id) return;

  await supabase
    .from("goals")
    .update({ is_active: false })
    .eq("user_id", userId)
    .neq("id", id);
  await supabase
    .from("goals")
    .update({ is_active: true })
    .eq("user_id", userId)
    .eq("id", id);

  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function deleteGoal(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const id = String(formData.get("id"));
  if (id) {
    await supabase.from("goals").delete().eq("id", id).eq("user_id", userId);
  }
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}
