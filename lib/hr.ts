// Pure, client-safe HR helpers (formatting + service/anniversary maths).

export const DOC_CATEGORIES = [
  "Contract",
  "Right to work",
  "Payroll",
  "Appraisal",
  "Disciplinary",
  "Certificate",
  "General",
] as const;

export const PROBATION_STATUS_META: Record<
  string,
  { label: string; class: string }
> = {
  pending: { label: "In progress", class: "bg-amber-100 text-amber-700" },
  passed: { label: "Passed", class: "bg-emerald-100 text-emerald-700" },
  extended: { label: "Extended", class: "bg-sky-100 text-sky-700" },
  failed: { label: "Not passed", class: "bg-rose-100 text-rose-700" },
};

export const APPRAISAL_STATUS_META: Record<
  string,
  { label: string; class: string }
> = {
  due: { label: "Due", class: "bg-amber-100 text-amber-700" },
  scheduled: { label: "Scheduled", class: "bg-sky-100 text-sky-700" },
  completed: { label: "Completed", class: "bg-emerald-100 text-emerald-700" },
};

export const SERVICE_MILESTONES = [1, 3, 5, 10, 15, 20, 25, 30, 40] as const;

export function formatMoney(
  amount: number | null,
  period = "annual",
): string {
  if (amount == null) return "—";
  const formatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);
  const suffix =
    period === "hourly" ? " / hr" : period === "daily" ? " / day" : " / yr";
  return formatted + suffix;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Whole years of service from a start date to `ref`. */
export function yearsOfService(startDate: string, ref = new Date()): number {
  const start = new Date(startDate);
  let years = ref.getFullYear() - start.getFullYear();
  const monthDiff = ref.getMonth() - start.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < start.getDate())) {
    years -= 1;
  }
  return Math.max(0, years);
}

/** The next service milestone anniversary date within `withinDays`, if any. */
export function upcomingMilestone(
  startDate: string,
  withinDays = 60,
  ref = new Date(),
): { years: number; date: Date } | null {
  const start = new Date(startDate);
  const completed = yearsOfService(startDate, ref);
  for (const m of SERVICE_MILESTONES) {
    if (m <= completed) continue;
    const date = new Date(start);
    date.setFullYear(start.getFullYear() + m);
    const days = (date.getTime() - ref.getTime()) / 86_400_000;
    if (days >= -1 && days <= withinDays) return { years: m, date };
    if (days > withinDays) break;
  }
  return null;
}

/** Days from now until `date` (negative = overdue). */
export function daysUntil(date: string, ref = new Date()): number {
  return Math.ceil((new Date(date).getTime() - ref.getTime()) / 86_400_000);
}

export function toilBalanceLabel(hours: number): string {
  const rounded = Math.round(hours * 100) / 100;
  return `${rounded} hr${Math.abs(rounded) === 1 ? "" : "s"}`;
}
