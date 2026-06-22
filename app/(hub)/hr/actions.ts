"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function val(form: FormData, key: string): string | null {
  const v = form.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function audit(
  subjectId: string,
  action: string,
  detail?: string | null,
) {
  const { supabase, user } = await ctx();
  await supabase.from("hr_audit").insert({
    actor_id: user.id,
    subject_id: subjectId,
    action,
    detail: detail ?? null,
  });
}

function refresh(userId: string) {
  revalidatePath(`/hr/people/${userId}`);
  revalidatePath("/hr");
  revalidatePath("/team");
}

// --- Employment & pay (HR only; RLS enforces) ------------------------------
export async function saveHrRecord(form: FormData) {
  const { supabase } = await ctx();
  const userId = String(form.get("user_id"));
  if (!userId) return;

  const salaryRaw = form.get("salary");
  const salary =
    typeof salaryRaw === "string" && salaryRaw.trim() !== ""
      ? Number(salaryRaw)
      : null;

  const { error } = await supabase.from("hr_records").upsert({
    user_id: userId,
    start_date: val(form, "start_date"),
    employment_type: val(form, "employment_type"),
    salary: salary != null && Number.isFinite(salary) ? salary : null,
    pay_period: String(form.get("pay_period") || "annual"),
    ni_number: val(form, "ni_number"),
    notes: val(form, "notes"),
  });
  if (!error) await audit(userId, "update_employment", "Pay/employment updated");
  refresh(userId);
}

// --- Probation (manager + HR) ----------------------------------------------
export async function saveProbation(form: FormData) {
  const { supabase, user } = await ctx();
  const userId = String(form.get("user_id"));
  if (!userId) return;
  const status = String(form.get("status") || "pending");
  const decided = status !== "pending";

  await supabase.from("probation").upsert({
    user_id: userId,
    end_date: val(form, "end_date"),
    status,
    notes: val(form, "notes"),
    reviewed_by: decided ? user.id : null,
    reviewed_at: decided ? new Date().toISOString() : null,
  });
  refresh(userId);
}

// --- Appraisals (manager + HR) ---------------------------------------------
export async function addAppraisal(form: FormData) {
  const { supabase } = await ctx();
  const userId = String(form.get("user_id"));
  if (!userId) return;
  await supabase.from("appraisals").insert({
    user_id: userId,
    due_date: val(form, "due_date"),
    scheduled_for: val(form, "scheduled_for"),
    status: val(form, "scheduled_for") ? "scheduled" : "due",
  });
  refresh(userId);
}

export async function completeAppraisal(form: FormData) {
  const { supabase, user } = await ctx();
  const userId = String(form.get("user_id"));
  const id = String(form.get("id"));
  if (!id) return;
  await supabase
    .from("appraisals")
    .update({
      status: "completed",
      rating: val(form, "rating"),
      summary: val(form, "summary"),
      conducted_by: user.id,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
  refresh(userId);
}

export async function deleteAppraisal(form: FormData) {
  const { supabase } = await ctx();
  const userId = String(form.get("user_id"));
  const id = String(form.get("id"));
  if (id) await supabase.from("appraisals").delete().eq("id", id);
  refresh(userId);
}

// --- Return to work (manager + HR) -----------------------------------------
export async function addRtw(form: FormData) {
  const { supabase, user } = await ctx();
  const userId = String(form.get("user_id"));
  if (!userId) return;
  await supabase.from("rtw_interviews").insert({
    user_id: userId,
    absence_start: val(form, "absence_start"),
    absence_end: val(form, "absence_end"),
    reason: val(form, "reason"),
    notes: val(form, "notes"),
    conducted_by: user.id,
  });
  refresh(userId);
}

// --- TOIL (manager + HR) ----------------------------------------------------
export async function addToil(form: FormData) {
  const { supabase, user } = await ctx();
  const userId = String(form.get("user_id"));
  if (!userId) return;
  const hoursRaw = Number(form.get("hours"));
  const direction = String(form.get("direction") || "earned");
  if (!Number.isFinite(hoursRaw) || hoursRaw <= 0) return;
  const hours = direction === "taken" ? -Math.abs(hoursRaw) : Math.abs(hoursRaw);

  await supabase.from("toil_entries").insert({
    user_id: userId,
    hours,
    reason: val(form, "reason"),
    recorded_by: user.id,
  });
  refresh(userId);
}

export async function deleteToil(form: FormData) {
  const { supabase } = await ctx();
  const userId = String(form.get("user_id"));
  const id = String(form.get("id"));
  if (id) await supabase.from("toil_entries").delete().eq("id", id);
  refresh(userId);
}

// --- Long service (HR) ------------------------------------------------------
export async function addServiceAward(form: FormData) {
  const { supabase } = await ctx();
  const userId = String(form.get("user_id"));
  const years = Number(form.get("years"));
  if (!userId || !Number.isFinite(years)) return;
  await supabase
    .from("service_awards")
    .upsert(
      { user_id: userId, years, note: val(form, "note") },
      { onConflict: "user_id,years" },
    );
  refresh(userId);
}

// --- Documents (HR) ---------------------------------------------------------
/** Save metadata after the file has been uploaded to the private bucket. */
export async function addDocumentMeta(
  userId: string,
  title: string,
  category: string,
  filePath: string,
  contentType: string | null,
) {
  const { supabase, user } = await ctx();
  await supabase.from("employee_documents").insert({
    user_id: userId,
    title,
    category,
    file_path: filePath,
    content_type: contentType,
    uploaded_by: user.id,
  });
  await audit(userId, "upload_document", title);
  refresh(userId);
}

export async function deleteDocument(form: FormData) {
  const { supabase } = await ctx();
  const userId = String(form.get("user_id"));
  const id = String(form.get("id"));
  const path = String(form.get("path"));
  if (id) {
    await supabase.storage.from("hr-docs").remove([path]);
    await supabase.from("employee_documents").delete().eq("id", id);
    await audit(userId, "delete_document", path);
  }
  refresh(userId);
}

/** Short-lived signed URL for a private document (owner or HR, via RLS). */
export async function getDocumentUrl(path: string): Promise<string | null> {
  const { supabase } = await ctx();
  const { data } = await supabase.storage
    .from("hr-docs")
    .createSignedUrl(path, 60);
  return data?.signedUrl ?? null;
}
