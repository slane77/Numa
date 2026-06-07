"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type PreferenceKind = Database["public"]["Enums"]["preference_kind"];
const KINDS: PreferenceKind[] = ["like", "dislike", "allergy", "diet"];
const SEVERITIES = ["mild", "moderate", "severe"];

export type PreferenceActionState = { error: string } | { ok: true } | null;

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function addPreference(
  _prev: PreferenceActionState,
  formData: FormData,
): Promise<PreferenceActionState> {
  const { supabase, userId } = await getUserId();

  const kind = String(formData.get("kind")) as PreferenceKind;
  const value = String(formData.get("value") ?? "").trim();
  const severityRaw = String(formData.get("severity") ?? "");
  const severity = SEVERITIES.includes(severityRaw) ? severityRaw : null;

  if (!KINDS.includes(kind)) return { error: "Pick a valid type." };
  if (!value) return { error: "Enter what you'd like to add." };

  const { error } = await supabase.from("food_preferences").insert({
    user_id: userId,
    kind,
    value,
    // Severity only really applies to allergies.
    severity: kind === "allergy" ? severity : null,
  });
  if (error) return { error: error.message };

  revalidatePath("/preferences");
  return { ok: true };
}

export async function deletePreference(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const id = String(formData.get("id"));
  if (id) {
    await supabase
      .from("food_preferences")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
  }
  revalidatePath("/preferences");
}
