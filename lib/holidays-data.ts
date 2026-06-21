import { createClient } from "@/lib/supabase/server";
import { currentLeaveYear } from "@/lib/holidays";
import type { Tables } from "@/lib/types/database";

export type HolidayRequest = Tables<"holiday_requests">;
export type RequestWithName = HolidayRequest & { personName?: string };

async function attachNames(
  rows: HolidayRequest[],
): Promise<RequestWithName[]> {
  const ids = [...new Set(rows.map((r) => r.user_id))];
  if (ids.length === 0) return rows;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  const names = new Map(
    (data ?? []).map((p) => [p.id, p.display_name ?? "Someone"]),
  );
  return rows.map((r) => ({ ...r, personName: names.get(r.user_id) }));
}

export type LeaveSummary = {
  allowance: number;
  approved: number;
  pending: number;
  remaining: number;
  yearLabel: string;
};

/** Allowance vs booked/pending for the current leave year. */
export async function getLeaveSummary(
  userId: string,
  allowance: number,
): Promise<LeaveSummary> {
  const supabase = await createClient();
  const { startIso, endIso, label } = currentLeaveYear();

  const { data } = await supabase
    .from("holiday_requests")
    .select("working_days, status, start_date")
    .eq("user_id", userId)
    .gte("start_date", startIso)
    .lte("start_date", endIso)
    .in("status", ["approved", "pending"]);

  let approved = 0;
  let pending = 0;
  for (const r of data ?? []) {
    if (r.status === "approved") approved += Number(r.working_days);
    else if (r.status === "pending") pending += Number(r.working_days);
  }
  return {
    allowance,
    approved,
    pending,
    remaining: allowance - approved - pending,
    yearLabel: label,
  };
}

/** The current user's own requests, newest first. */
export async function getMyRequests(userId: string): Promise<HolidayRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("holiday_requests")
    .select("*")
    .eq("user_id", userId)
    .order("start_date", { ascending: false });
  return data ?? [];
}

/**
 * Pending requests awaiting the current user's decision. RLS already limits
 * visible rows to the user's reports (+ admins see everyone), so we just filter
 * to pending and exclude the user's own request.
 */
export async function getApprovalQueue(
  userId: string,
): Promise<RequestWithName[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("holiday_requests")
    .select("*")
    .eq("status", "pending")
    .neq("user_id", userId)
    .order("start_date", { ascending: true });
  return attachNames(data ?? []);
}
