"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { countWorkingDays } from "@/lib/holidays";

export type RequestState = { error: string } | { ok: string } | null;

export async function requestHoliday(
  _prev: RequestState,
  form: FormData,
): Promise<RequestState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const start = String(form.get("start_date") ?? "");
  const end = String(form.get("end_date") ?? "");
  const note = String(form.get("note") ?? "").trim() || null;

  if (!start || !end) return { error: "Pick a start and end date." };
  if (end < start) return { error: "The end date can't be before the start." };

  const working_days = countWorkingDays(start, end);
  if (working_days <= 0) {
    return { error: "That range has no working days (Mon–Fri)." };
  }

  const { error } = await supabase.from("holiday_requests").insert({
    user_id: user.id,
    start_date: start,
    end_date: end,
    working_days,
    note,
  });
  if (error) return { error: error.message };

  revalidatePath("/holidays");
  return { ok: `Requested ${working_days} day(s). Sent for approval.` };
}

export async function cancelHoliday(form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(form.get("id"));
  if (id) {
    // Owner can only cancel their own still-pending request.
    await supabase
      .from("holiday_requests")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "pending");
  }
  revalidatePath("/holidays");
}

/** Approve or decline a report's request (manager/admin only — enforced by RLS). */
export async function decideHoliday(form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(form.get("id"));
  const decision = String(form.get("decision"));
  const decision_note = String(form.get("decision_note") ?? "").trim() || null;
  if (!id || (decision !== "approved" && decision !== "declined")) return;

  await supabase
    .from("holiday_requests")
    .update({
      status: decision,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
      decision_note,
    })
    .eq("id", id)
    .eq("status", "pending");

  revalidatePath("/holidays");
}
