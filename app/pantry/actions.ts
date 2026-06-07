"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export type PantryActionState = { error: string } | { ok: true } | null;

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function addInventoryItem(
  _prev: PantryActionState,
  formData: FormData,
): Promise<PantryActionState> {
  const { supabase, userId } = await getUserId();

  const itemName = str(formData.get("item_name"));
  if (!itemName) return { error: "Enter an item name." };

  const { error } = await supabase.from("inventory").insert({
    user_id: userId,
    item_name: itemName,
    quantity: num(formData.get("quantity")) ?? 1,
    unit: str(formData.get("unit")),
    category: str(formData.get("category")),
    expires_at: str(formData.get("expires_at")),
  });
  if (error) return { error: error.message };

  revalidatePath("/pantry");
  return { ok: true };
}

export async function deleteInventoryItem(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const id = String(formData.get("id"));
  if (id) {
    await supabase.from("inventory").delete().eq("id", id).eq("user_id", userId);
  }
  revalidatePath("/pantry");
}
