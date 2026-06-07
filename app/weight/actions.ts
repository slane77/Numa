"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type WeightActionState = { error: string } | { ok: true } | null;

export async function logWeight(
  _prev: WeightActionState,
  formData: FormData,
): Promise<WeightActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const weight = Number(formData.get("weight_kg"));
  if (!Number.isFinite(weight) || weight <= 0) {
    return { error: "Enter a valid weight." };
  }

  const loggedAtRaw = formData.get("logged_at");
  const logged_at =
    typeof loggedAtRaw === "string" && loggedAtRaw !== ""
      ? loggedAtRaw
      : new Date().toISOString().slice(0, 10);

  const noteRaw = formData.get("note");
  const note =
    typeof noteRaw === "string" && noteRaw.trim() !== "" ? noteRaw.trim() : null;

  const { error } = await supabase.from("weight_logs").insert({
    user_id: user.id,
    weight_kg: weight,
    logged_at,
    note,
  });
  if (error) return { error: error.message };

  revalidatePath("/weight");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteWeightLog(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id"));
  if (id) {
    // RLS also scopes this to the owner; the user_id filter is belt-and-braces.
    await supabase.from("weight_logs").delete().eq("id", id).eq("user_id", user.id);
  }
  revalidatePath("/weight");
  revalidatePath("/dashboard");
}
