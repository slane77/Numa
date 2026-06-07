"use client";

import { useActionState, useEffect, useRef } from "react";
import { createGoal, type GoalActionState } from "./actions";
import { Field, SubmitButton, inputClass } from "@/components/ui";

export default function GoalForm() {
  const [state, formAction, pending] = useActionState<GoalActionState, FormData>(
    createGoal,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Goal type">
          <select name="type" defaultValue="weight_loss" className={inputClass}>
            <option value="weight_loss">Lose weight</option>
            <option value="maintain">Maintain weight</option>
            <option value="weight_gain">Gain weight</option>
            <option value="event">Event prep</option>
          </select>
        </Field>
        <Field label="Target weight (kg)">
          <input
            name="target_weight_kg"
            type="number"
            step="0.1"
            min="0"
            className={inputClass}
          />
        </Field>
        <Field label="Target date">
          <input name="target_date" type="date" className={inputClass} />
        </Field>
        <Field label="Daily calorie target">
          <input
            name="calorie_target"
            type="number"
            min="0"
            className={inputClass}
          />
        </Field>
        <Field label="Daily protein target (g)">
          <input
            name="protein_target_g"
            type="number"
            min="0"
            className={inputClass}
          />
        </Field>
      </div>

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton pending={pending}>
        {pending ? "Saving…" : "Add goal"}
      </SubmitButton>
    </form>
  );
}
