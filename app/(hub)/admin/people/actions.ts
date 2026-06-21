"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/user";

/**
 * Admin-only: set a person's role, line manager and annual leave allowance.
 * RLS + the profiles guard trigger also enforce admin-only on these fields.
 */
export async function updatePerson(form: FormData) {
  if (!(await isAdmin())) redirect("/home");

  const supabase = await createClient();
  const id = String(form.get("id"));
  if (!id) return;

  const roleRaw = String(form.get("role"));
  const role = ["employee", "editor", "admin"].includes(roleRaw)
    ? (roleRaw as "employee" | "editor" | "admin")
    : "employee";

  const managerRaw = String(form.get("manager_id") ?? "");
  const manager_id = managerRaw && managerRaw !== id ? managerRaw : null;

  const allowance = Number(form.get("annual_leave_days"));
  const annual_leave_days =
    Number.isFinite(allowance) && allowance >= 0 ? allowance : 25;

  await supabase
    .from("profiles")
    .update({ role, manager_id, annual_leave_days })
    .eq("id", id);

  revalidatePath("/admin/people");
}
