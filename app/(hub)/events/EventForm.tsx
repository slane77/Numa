"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import MediaUpload from "@/components/MediaUpload";
import type { EventActionState } from "./actions";
import type { Tables } from "@/lib/types/database";

type Action = (
  state: EventActionState,
  form: FormData,
) => Promise<EventActionState>;

const inputClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dateValue(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function timeValue(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-brand-600 px-6 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export default function EventForm({
  action,
  event,
  submitLabel = "Create event",
}: {
  action: Action;
  event?: Tables<"events">;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<EventActionState, FormData>(
    action,
    null,
  );
  const [cover, setCover] = useState(event?.cover_image_url ?? "");
  const [allDay, setAllDay] = useState(event?.all_day ?? false);

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Event name
        </span>
        <input
          name="title"
          required
          defaultValue={event?.title ?? ""}
          placeholder="e.g. Summer staff social"
          className={`${inputClass} text-lg`}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Location
        </span>
        <input
          name="location"
          defaultValue={event?.location ?? ""}
          placeholder="e.g. London HQ, or a Teams link"
          className={inputClass}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          name="all_day"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="h-4 w-4 rounded border-stone-300"
        />
        All-day event
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Starts
          </span>
          <div className="flex gap-2">
            <input
              type="date"
              name="start_date"
              required
              defaultValue={dateValue(event?.starts_at)}
              className={inputClass}
            />
            {!allDay && (
              <input
                type="time"
                name="start_time"
                defaultValue={timeValue(event?.starts_at) || "09:00"}
                className={inputClass}
              />
            )}
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Ends <span className="text-stone-400">(optional)</span>
          </span>
          <div className="flex gap-2">
            <input
              type="date"
              name="end_date"
              defaultValue={dateValue(event?.ends_at)}
              className={inputClass}
            />
            {!allDay && (
              <input
                type="time"
                name="end_time"
                defaultValue={timeValue(event?.ends_at)}
                className={inputClass}
              />
            )}
          </div>
        </label>
      </div>

      <MediaUpload
        value={cover}
        onChange={setCover}
        folder="events"
        label="Event graphic"
      />
      <input type="hidden" name="cover_image_url" value={cover} />

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Details
        </span>
        <textarea
          name="description"
          rows={8}
          defaultValue={event?.description ?? ""}
          placeholder="What's happening, who's invited, what to bring…"
          className={`${inputClass} resize-y leading-relaxed`}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          name="published"
          defaultChecked={event?.published ?? true}
          className="h-4 w-4 rounded border-stone-300"
        />
        Published (uncheck to save as a draft)
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <SaveButton label={submitLabel} />
      </div>
    </form>
  );
}
