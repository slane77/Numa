"use client";

import { useActionState, useEffect, useRef } from "react";
import { addPlanItem, type PlanActionState } from "../actions";
import { SubmitButton, inputClass } from "@/components/ui";

export default function AddItemForm({
  planId,
  days,
  recipes,
}: {
  planId: string;
  days: string[];
  recipes: { id: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState<PlanActionState, FormData>(
    addPlanItem,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Keep the day/meal selection; only the action result resetting matters on
    // success. addPlanItem returns null on success, so reset then.
    if (state === null) formRef.current?.reset();
  }, [state]);

  if (recipes.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        Add some recipes first, then you can assign them to days here.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_5rem_auto] sm:items-end"
    >
      <input type="hidden" name="meal_plan_id" value={planId} />

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">Day</span>
        <select name="day" className={inputClass} defaultValue={days[0]}>
          {days.map((d) => (
            <option key={d} value={d}>
              {new Date(d).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Meal
        </span>
        <select name="meal" className={inputClass} defaultValue="dinner">
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Recipe
        </span>
        <select name="recipe_id" className={inputClass} defaultValue="">
          <option value="" disabled>
            Choose a recipe…
          </option>
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Servings
        </span>
        <input
          name="servings"
          type="number"
          min="1"
          defaultValue={1}
          className={inputClass}
        />
      </label>

      <SubmitButton pending={pending}>{pending ? "Adding…" : "Add"}</SubmitButton>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-5">
          {state.error}
        </p>
      )}
    </form>
  );
}
