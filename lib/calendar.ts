// Pure, client-safe helpers (types, constants, date maths). Server-only data
// fetching lives in lib/calendar-data.ts so this module can be imported from
// Client Components without dragging in next/headers.
import type { Tables } from "@/lib/types/database";

export type WorkLocation = Tables<"work_status">["location"];

export const LOCATION_META: Record<
  WorkLocation,
  { label: string; short: string; emoji: string; class: string }
> = {
  office: {
    label: "In the office",
    short: "Office",
    emoji: "🏢",
    class: "bg-brand-100 text-brand-700",
  },
  home: {
    label: "Working from home",
    short: "Home",
    emoji: "🏠",
    class: "bg-emerald-100 text-emerald-700",
  },
  away: {
    label: "Away / off",
    short: "Away",
    emoji: "🌴",
    class: "bg-amber-100 text-amber-700",
  },
};

/** Local YYYY-MM-DD (avoids UTC off-by-one from toISOString). */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** The Monday of the week, shifted by `offset` weeks from today. */
export function mondayOf(offset = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow + offset * 7);
  return d;
}

export type WeekDay = { date: Date; iso: string; label: string; isToday: boolean };

/** Monday–Friday for the given week offset. */
export function workWeek(offset = 0): WeekDay[] {
  const monday = mondayOf(offset);
  const todayIso = ymd(new Date());
  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const iso = ymd(date);
    return {
      date,
      iso,
      label: date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
      }),
      isToday: iso === todayIso,
    };
  });
}

export function weekRangeLabel(days: WeekDay[]): string {
  if (days.length === 0) return "";
  const first = days[0].date;
  const last = days[days.length - 1].date;
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${first.toLocaleDateString("en-GB", opts)} – ${last.toLocaleDateString(
    "en-GB",
    opts,
  )}`;
}

export type Person = { id: string; name: string; department: string | null };
export type StatusMap = Map<string, WorkLocation>; // key: `${userId}:${iso}`
