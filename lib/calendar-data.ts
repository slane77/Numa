import { createClient } from "@/lib/supabase/server";
import type {
  Person,
  StatusMap,
  WeekDay,
  WorkLocation,
} from "@/lib/calendar";

/** All staff plus their statuses for the given week (Mon–Fri). */
export async function getWeekBoard(days: WeekDay[]): Promise<{
  people: Person[];
  statuses: StatusMap;
}> {
  const supabase = await createClient();
  const isos = days.map((d) => d.iso);

  const weekStart = isos[0];
  const weekEnd = isos[isos.length - 1];

  const [{ data: profiles }, { data: rows }, { data: leave }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, department")
        .order("display_name"),
      supabase
        .from("work_status")
        .select("user_id, day, location")
        .gte("day", weekStart)
        .lte("day", weekEnd),
      // Approved holidays overlapping this week show as "away".
      supabase
        .from("holiday_requests")
        .select("user_id, start_date, end_date")
        .eq("status", "approved")
        .lte("start_date", weekEnd)
        .gte("end_date", weekStart),
    ]);

  const people: Person[] = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.display_name ?? "Unnamed",
    department: p.department,
  }));

  const statuses: StatusMap = new Map();

  // Holidays first; an explicit work_status entry below takes precedence.
  for (const h of leave ?? []) {
    for (const d of days) {
      if (d.iso >= h.start_date && d.iso <= h.end_date) {
        statuses.set(`${h.user_id}:${d.iso}`, "away");
      }
    }
  }
  for (const r of rows ?? []) {
    statuses.set(`${r.user_id}:${r.day}`, r.location);
  }
  return { people, statuses };
}

/** Just the current user's statuses for the week, keyed by ISO date. */
export async function getMyWeek(
  userId: string,
  days: WeekDay[],
): Promise<Record<string, WorkLocation>> {
  const supabase = await createClient();
  const isos = days.map((d) => d.iso);
  const { data } = await supabase
    .from("work_status")
    .select("day, location")
    .eq("user_id", userId)
    .gte("day", isos[0])
    .lte("day", isos[isos.length - 1]);

  const out: Record<string, WorkLocation> = {};
  for (const r of data ?? []) out[r.day] = r.location;
  return out;
}
