"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RsvpStatus } from "@/lib/events";

export type EventActionState = { error: string } | null;

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Combine a date input + optional time input into an ISO timestamp. */
function toTimestamp(date: string, time: string): string | null {
  if (!date) return null;
  const t = time || "00:00";
  const d = new Date(`${date}T${t}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function readEvent(form: FormData) {
  const all_day = form.get("all_day") === "on";
  const starts_at = toTimestamp(str(form, "start_date"), all_day ? "" : str(form, "start_time"));
  const endDate = str(form, "end_date");
  const ends_at = endDate
    ? toTimestamp(endDate, all_day ? "" : str(form, "end_time"))
    : null;

  return {
    title: str(form, "title"),
    description: str(form, "description"),
    location: str(form, "location") || null,
    cover_image_url: str(form, "cover_image_url") || null,
    all_day,
    starts_at,
    ends_at,
    published: form.get("published") !== "off",
  };
}

export async function createEvent(
  _prev: EventActionState,
  form: FormData,
): Promise<EventActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const e = readEvent(form);
  if (!e.title) return { error: "Give your event a name." };
  if (!e.starts_at) return { error: "Pick a start date." };

  const { data, error } = await supabase
    .from("events")
    .insert({ ...e, starts_at: e.starts_at, organiser_id: user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/events");
  redirect(`/events/${data.id}`);
}

export async function updateEvent(
  id: string,
  _prev: EventActionState,
  form: FormData,
): Promise<EventActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const e = readEvent(form);
  if (!e.title) return { error: "Give your event a name." };
  if (!e.starts_at) return { error: "Pick a start date." };

  const { error } = await supabase
    .from("events")
    .update({ ...e, starts_at: e.starts_at })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  redirect(`/events/${id}`);
}

export async function deleteEvent(form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(form.get("id"));
  if (id) await supabase.from("events").delete().eq("id", id);
  revalidatePath("/events");
  redirect("/events");
}

/** Upsert the current user's RSVP for an event. */
export async function setRsvp(eventId: string, status: RsvpStatus) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("event_rsvps")
    .upsert(
      { event_id: eventId, user_id: user.id, status },
      { onConflict: "event_id,user_id" },
    );
  revalidatePath(`/events/${eventId}`);
}

/** Add a photo/video (already uploaded to storage) to an event's gallery. */
export async function addEventMedia(
  eventId: string,
  url: string,
  kind: "image" | "video",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!url) return;

  await supabase
    .from("event_media")
    .insert({ event_id: eventId, url, kind, uploaded_by: user.id });
  revalidatePath(`/events/${eventId}`);
}

export async function deleteEventMedia(form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(form.get("media_id"));
  const eventId = String(form.get("event_id"));
  if (id) await supabase.from("event_media").delete().eq("id", id);
  if (eventId) revalidatePath(`/events/${eventId}`);
}
