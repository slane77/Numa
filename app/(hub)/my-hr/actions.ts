"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SaveState = { error: string } | { ok: true } | null;

function val(form: FormData, key: string): string | null {
  const v = form.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

async function uid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function savePersonalDetails(
  _prev: SaveState,
  form: FormData,
): Promise<SaveState> {
  const { supabase, user } = await uid();
  const { error } = await supabase.from("personal_details").upsert({
    user_id: user.id,
    dob: val(form, "dob"),
    home_address: val(form, "home_address"),
    personal_phone: val(form, "personal_phone"),
    personal_email: val(form, "personal_email"),
  });
  if (error) return { error: error.message };
  revalidatePath("/my-hr");
  return { ok: true };
}

export async function addNextOfKin(_prev: SaveState, form: FormData): Promise<SaveState> {
  const { supabase, user } = await uid();
  const name = val(form, "name");
  if (!name) return { error: "Enter a name." };
  const { error } = await supabase.from("next_of_kin").insert({
    user_id: user.id,
    name,
    relationship: val(form, "relationship"),
    phone: val(form, "phone"),
    email: val(form, "email"),
  });
  if (error) return { error: error.message };
  revalidatePath("/my-hr");
  return { ok: true };
}

export async function deleteNextOfKin(form: FormData) {
  const { supabase, user } = await uid();
  const id = String(form.get("id"));
  if (id) {
    await supabase
      .from("next_of_kin")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
  }
  revalidatePath("/my-hr");
}
