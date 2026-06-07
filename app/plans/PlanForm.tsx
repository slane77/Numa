"use client";

import { useActionState } from "react";
import { createPlan, type PlanActionState } from "./actions";
import { Field, SubmitButton, inputClass } from "@/components/ui";

export default function PlanForm() {
  const [state, formAction, pending] = useActionState<PlanActionState, FormData>(
    createPlan,
    null,
  );

  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const today = start.toISOString().slice(0, 10);
  const inAWeek = end.toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Title">
        <input
          name="title"
          type="text"
          placeholder="e.g. This week"
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start date" required>
          <input
            name="start_date"
            type="date"
            required
            defaultValue={today}
            className={inputClass}
          />
        </Field>
        <Field label="End date" required>
          <input
            name="end_date"
            type="date"
            required
            defaultValue={inAWeek}
            className={inputClass}
          />
        </Field>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton pending={pending}>
        {pending ? "Creating…" : "Create plan"}
      </SubmitButton>
    </form>
  );
}
