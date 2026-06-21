"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfileActionState =
  | { error: string }
  | { ok: true }
  | null;

function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export async function updateProfile(
  _prev: ProfileActionState,
  form: FormData,
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const display_name = str(form, "display_name");
  if (!display_name) return { error: "Please enter your name." };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name,
      job_title: str(form, "job_title"),
      department: str(form, "department"),
      location: str(form, "location"),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/home");
  return { ok: true };
}
