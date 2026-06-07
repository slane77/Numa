"use client";

import { useActionState, useEffect, useRef } from "react";
import { logWeight, type WeightActionState } from "./actions";

const inputClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function WeightLogForm() {
  const [state, formAction, pending] = useActionState<
    WeightActionState,
    FormData
  >(logWeight, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Weight (kg)
        </span>
        <input
          name="weight_kg"
          type="number"
          step="0.1"
          min="0"
          required
          placeholder="e.g. 78.5"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Date
        </span>
        <input
          name="logged_at"
          type="date"
          defaultValue={today}
          max={today}
          className={inputClass}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="h-[42px] rounded-full bg-brand-600 px-5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Log"}
      </button>

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-3">
          {state.error}
        </p>
      )}
    </form>
  );
}
