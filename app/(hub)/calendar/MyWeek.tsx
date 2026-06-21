"use client";

import { useTransition } from "react";
import { setWorkStatus } from "./actions";
import { LOCATION_META, type WorkLocation, type WeekDay } from "@/lib/calendar";

const ORDER: WorkLocation[] = ["office", "home", "away"];

export default function MyWeek({
  days,
  initial,
}: {
  days: WeekDay[];
  initial: Record<string, WorkLocation>;
}) {
  const [pending, startTransition] = useTransition();

  function set(iso: string, loc: WorkLocation, isActive: boolean) {
    // Tapping the active option clears it back to "not set".
    startTransition(() => setWorkStatus(iso, isActive ? null : loc));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-5">
      {days.map((d) => {
        const current = initial[d.iso];
        return (
          <div
            key={d.iso}
            className={`rounded-xl border p-3 ${
              d.isToday ? "border-brand-300 bg-brand-50/40" : "border-stone-200"
            }`}
          >
            <p className="mb-2 text-sm font-medium text-stone-700">{d.label}</p>
            <div className="flex flex-col gap-1.5">
              {ORDER.map((loc) => {
                const meta = LOCATION_META[loc];
                const active = current === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    disabled={pending}
                    onClick={() => set(d.iso, loc, active)}
                    className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                      active
                        ? meta.class
                        : "text-stone-500 hover:bg-stone-100"
                    }`}
                  >
                    <span>{meta.emoji}</span>
                    {meta.short}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
