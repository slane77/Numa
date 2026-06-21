import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database";

export type EventRow = Tables<"events">;
export type EventWithOrganiser = EventRow & { organiserName?: string };
export type RsvpStatus = Tables<"event_rsvps">["status"];

/** Human-friendly date/time for an event, collapsing same-day ranges. */
export function formatEventWhen(event: {
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
}): string {
  const start = new Date(event.starts_at);
  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  const date = start.toLocaleDateString("en-GB", dateOpts);

  if (event.all_day) return `${date} · All day`;

  const startTime = start.toLocaleTimeString("en-GB", timeOpts);
  if (!event.ends_at) return `${date} · ${startTime}`;

  const end = new Date(event.ends_at);
  const sameDay = start.toDateString() === end.toDateString();
  const endTime = end.toLocaleTimeString("en-GB", timeOpts);
  if (sameDay) return `${date} · ${startTime}–${endTime}`;

  return `${date} ${startTime} → ${end.toLocaleDateString(
    "en-GB",
    dateOpts,
  )} ${endTime}`;
}

export function isPastEvent(event: { ends_at: string | null; starts_at: string }) {
  const end = new Date(event.ends_at ?? event.starts_at).getTime();
  return end < Date.now();
}

async function withOrganisers(
  events: EventRow[],
): Promise<EventWithOrganiser[]> {
  const ids = [...new Set(events.map((e) => e.organiser_id).filter(Boolean))];
  if (ids.length === 0) return events;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ids as string[]);
  const names = new Map(
    (data ?? []).map((p) => [p.id, p.display_name ?? undefined]),
  );
  return events.map((e) => ({
    ...e,
    organiserName: e.organiser_id ? names.get(e.organiser_id) : undefined,
  }));
}

/** Upcoming + past events (ascending upcoming, descending past). */
export async function getEvents(): Promise<{
  upcoming: EventWithOrganiser[];
  past: EventWithOrganiser[];
}> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data: upcomingRaw } = await supabase
    .from("events")
    .select("*")
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true });

  const { data: pastRaw } = await supabase
    .from("events")
    .select("*")
    .lt("starts_at", nowIso)
    .order("starts_at", { ascending: false })
    .limit(30);

  const [upcoming, past] = await Promise.all([
    withOrganisers(upcomingRaw ?? []),
    withOrganisers(pastRaw ?? []),
  ]);
  return { upcoming, past };
}

export async function getEvent(id: string): Promise<EventWithOrganiser | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const [withName] = await withOrganisers([data]);
  return withName;
}

export type RsvpPerson = { status: RsvpStatus; name: string };

/** RSVP counts, the attendee list (with names), and the current user's status. */
export async function getRsvps(
  eventId: string,
  userId?: string,
): Promise<{
  counts: Record<RsvpStatus, number>;
  going: RsvpPerson[];
  mine: RsvpStatus | null;
}> {
  const supabase = await createClient();
  const { data: rsvps } = await supabase
    .from("event_rsvps")
    .select("user_id, status")
    .eq("event_id", eventId);

  const counts: Record<RsvpStatus, number> = {
    going: 0,
    maybe: 0,
    not_going: 0,
  };
  let mine: RsvpStatus | null = null;
  const goingIds: string[] = [];
  for (const r of rsvps ?? []) {
    counts[r.status] += 1;
    if (r.status === "going") goingIds.push(r.user_id);
    if (userId && r.user_id === userId) mine = r.status;
  }

  let going: RsvpPerson[] = [];
  if (goingIds.length) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", goingIds);
    const names = new Map(
      (people ?? []).map((p) => [p.id, p.display_name ?? "Someone"]),
    );
    going = goingIds.map((id) => ({
      status: "going" as const,
      name: names.get(id) ?? "Someone",
    }));
  }

  return { counts, going, mine };
}

export async function getEventMedia(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_media")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
