"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { requestHoliday, type RequestState } from "./actions";
import { countWorkingDays, plural } from "@/lib/holidays";

const inputClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-brand-600 px-6 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Sending…" : "Request holiday"}
    </button>
  );
}

export default function RequestForm({ remaining }: { remaining: number }) {
  const [state, formAction] = useActionState<RequestState, FormData>(
    requestHoliday,
    null,
  );
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const days = countWorkingDays(start, end || start);
  const overBudget = days > 0 && days > remaining;

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">
            From
          </span>
          <input
            type="date"
            name="start_date"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">
            To
          </span>
          <input
            type="date"
            name="end_date"
            required
            value={end}
            min={start || undefined}
            onChange={(e) => setEnd(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Note <span className="text-stone-400">(optional)</span>
        </span>
        <input
          name="note"
          placeholder="e.g. Family holiday"
          className={inputClass}
        />
      </label>

      {days > 0 && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            overBudget
              ? "bg-amber-50 text-amber-700"
              : "bg-brand-50 text-brand-700"
          }`}
        >
          That&apos;s <strong>{plural(days, "working day")}</strong>.
          {overBudget &&
            ` That's more than your ${plural(remaining, "day")} remaining — you can still ask, but your manager will see it.`}
        </p>
      )}

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state && "ok" in state && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.ok}
        </p>
      )}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
