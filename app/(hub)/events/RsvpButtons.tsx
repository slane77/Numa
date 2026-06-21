"use client";

import { useTransition } from "react";
import { setRsvp } from "./actions";
import type { RsvpStatus } from "@/lib/events";

const OPTIONS: { status: RsvpStatus; label: string; emoji: string }[] = [
  { status: "going", label: "Going", emoji: "✅" },
  { status: "maybe", label: "Maybe", emoji: "🤔" },
  { status: "not_going", label: "Can't make it", emoji: "✖️" },
];

export default function RsvpButtons({
  eventId,
  mine,
}: {
  eventId: string;
  mine: RsvpStatus | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((o) => {
        const active = mine === o.status;
        return (
          <button
            key={o.status}
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => setRsvp(eventId, o.status))}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
              active
                ? "bg-brand-600 text-white shadow-sm"
                : "border border-stone-300 bg-white text-stone-700 hover:border-stone-400"
            }`}
          >
            {o.emoji} {o.label}
          </button>
        );
      })}
    </div>
  );
}
