// Pure, client-safe holiday helpers. Server queries live in lib/holidays-data.ts.
import type { Tables } from "@/lib/types/database";

export type HolidayStatus = Tables<"holiday_requests">["status"];

export const HOLIDAY_STATUS_META: Record<
  HolidayStatus,
  { label: string; class: string }
> = {
  pending: { label: "Pending", class: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", class: "bg-emerald-100 text-emerald-700" },
  declined: { label: "Declined", class: "bg-rose-100 text-rose-700" },
  cancelled: { label: "Cancelled", class: "bg-stone-200 text-stone-600" },
};

/** Count Mon–Fri days between two ISO dates (inclusive). 0 if invalid. */
export function countWorkingDays(startIso: string, endIso: string): number {
  if (!startIso || !endIso) return 0;
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** Calendar leave year containing `ref` (defaults to today). */
export function currentLeaveYear(ref = new Date()): {
  startIso: string;
  endIso: string;
  label: string;
} {
  const year = ref.getFullYear();
  return {
    startIso: `${year}-01-01`,
    endIso: `${year}-12-31`,
    label: String(year),
  };
}

export function formatDateRange(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const start = new Date(startIso).toLocaleDateString("en-GB", opts);
  if (startIso === endIso) return start;
  const end = new Date(endIso).toLocaleDateString("en-GB", opts);
  return `${start} → ${end}`;
}

export function plural(n: number, word: string): string {
  const rounded = Number.isInteger(n) ? n : Number(n.toFixed(1));
  return `${rounded} ${word}${rounded === 1 ? "" : "s"}`;
}
