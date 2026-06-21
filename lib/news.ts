/** Shared news helpers: categories, colours and date formatting. */

export const NEWS_CATEGORIES = [
  "General",
  "Announcement",
  "People",
  "Events",
  "IT & Systems",
  "Wellbeing",
  "Celebration",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

const CATEGORY_STYLES: Record<string, string> = {
  General: "bg-stone-100 text-stone-600",
  Announcement: "bg-brand-100 text-brand-700",
  People: "bg-violet-100 text-violet-700",
  Events: "bg-amber-100 text-amber-700",
  "IT & Systems": "bg-sky-100 text-sky-700",
  Wellbeing: "bg-emerald-100 text-emerald-700",
  Celebration: "bg-rose-100 text-rose-700",
};

export function categoryClass(category: string): string {
  return CATEGORY_STYLES[category] ?? "bg-stone-100 text-stone-600";
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatRelative(value: string): string {
  const then = new Date(value).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

/** Build a short excerpt from a post body when the author didn't supply one. */
export function deriveExcerpt(body: string, max = 160): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}
