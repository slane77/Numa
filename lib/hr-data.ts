import { createClient } from "@/lib/supabase/server";
import {
  daysUntil,
  upcomingMilestone,
  yearsOfService,
} from "@/lib/hr";
import type { Tables } from "@/lib/types/database";

export type StaffLite = {
  id: string;
  name: string;
  job_title: string | null;
  department: string | null;
};

/** Aggregated HR record for one person. RLS decides which parts come back, so
 *  e.g. a manager viewing a report simply gets null for pay/documents. */
export async function getPersonRecord(userId: string) {
  const supabase = await createClient();
  const [
    profile,
    personal,
    nok,
    hr,
    prob,
    appraisals,
    rtw,
    toil,
    docs,
    awards,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, job_title, department, location, manager_id")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("personal_details").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("next_of_kin").select("*").eq("user_id", userId).order("is_primary", { ascending: false }),
    supabase.from("hr_records").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("probation").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("appraisals").select("*").eq("user_id", userId).order("due_date", { ascending: false }),
    supabase.from("rtw_interviews").select("*").eq("user_id", userId).order("conducted_at", { ascending: false }),
    supabase.from("toil_entries").select("*").eq("user_id", userId).order("entry_date", { ascending: false }),
    supabase.from("employee_documents").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("service_awards").select("*").eq("user_id", userId).order("years", { ascending: false }),
  ]);

  const toilRows = toil.data ?? [];
  const toilBalance = toilRows.reduce((sum, e) => sum + Number(e.hours), 0);

  return {
    profile: profile.data,
    personal: personal.data,
    nok: nok.data ?? [],
    hr: hr.data,
    probation: prob.data,
    appraisals: appraisals.data ?? [],
    rtw: rtw.data ?? [],
    toil: toilRows,
    toilBalance,
    documents: docs.data ?? [],
    awards: awards.data ?? [],
  };
}

export type PersonRecord = Awaited<ReturnType<typeof getPersonRecord>>;

/** All staff (for the HR people list). */
export async function listStaff(): Promise<StaffLite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, job_title, department")
    .order("display_name");
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.display_name ?? "Unnamed",
    job_title: p.job_title,
    department: p.department,
  }));
}

/** A manager's direct reports. */
export async function getReports(managerId: string): Promise<StaffLite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, job_title, department")
    .eq("manager_id", managerId)
    .order("display_name");
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.display_name ?? "Unnamed",
    job_title: p.job_title,
    department: p.department,
  }));
}

export type DueItem = {
  kind: "probation" | "appraisal" | "anniversary";
  userId: string;
  name: string;
  label: string;
  date: string;
  days: number;
  overdue: boolean;
};

/** Everything needing HR's attention soon (probation, appraisals, milestones). */
export async function getHrDashboard(): Promise<DueItem[]> {
  const supabase = await createClient();
  const [{ data: profiles }, { data: hrRows }, { data: probs }, { data: apprs }] =
    await Promise.all([
      supabase.from("profiles").select("id, display_name"),
      supabase.from("hr_records").select("user_id, start_date"),
      supabase
        .from("probation")
        .select("user_id, end_date, status")
        .eq("status", "pending"),
      supabase
        .from("appraisals")
        .select("user_id, due_date, status")
        .neq("status", "completed"),
    ]);

  const names = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name ?? "Unnamed"]),
  );
  const items: DueItem[] = [];

  for (const p of probs ?? []) {
    if (!p.end_date) continue;
    const days = daysUntil(p.end_date);
    if (days <= 30) {
      items.push({
        kind: "probation",
        userId: p.user_id,
        name: names.get(p.user_id) ?? "Unnamed",
        label: "Probation ends",
        date: p.end_date,
        days,
        overdue: days < 0,
      });
    }
  }

  for (const a of apprs ?? []) {
    if (!a.due_date) continue;
    const days = daysUntil(a.due_date);
    if (days <= 30) {
      items.push({
        kind: "appraisal",
        userId: a.user_id,
        name: names.get(a.user_id) ?? "Unnamed",
        label: "Appraisal due",
        date: a.due_date,
        days,
        overdue: days < 0,
      });
    }
  }

  for (const r of hrRows ?? []) {
    if (!r.start_date) continue;
    const m = upcomingMilestone(r.start_date, 60);
    if (m) {
      const iso = m.date.toISOString().slice(0, 10);
      items.push({
        kind: "anniversary",
        userId: r.user_id,
        name: names.get(r.user_id) ?? "Unnamed",
        label: `${m.years}-year work anniversary`,
        date: iso,
        days: daysUntil(iso),
        overdue: false,
      });
    }
  }

  return items.sort((a, b) => a.days - b.days);
}

/** Years of service for one person (HR view), or null without a start date. */
export function serviceYears(hr: Tables<"hr_records"> | null): number | null {
  return hr?.start_date ? yearsOfService(hr.start_date) : null;
}
