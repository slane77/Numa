"use client";

import { useActionState, useState } from "react";
import { createRecipe, type RecipeActionState } from "./actions";
import { Field, SubmitButton, inputClass } from "@/components/ui";

type Row = { key: number };

export default function RecipeForm() {
  const [state, formAction, pending] = useActionState<
    RecipeActionState,
    FormData
  >(createRecipe, null);
  const [rows, setRows] = useState<Row[]>([{ key: 0 }, { key: 1 }]);
  const [nextKey, setNextKey] = useState(2);

  function addRow() {
    setRows((r) => [...r, { key: nextKey }]);
    setNextKey((k) => k + 1);
  }
  function removeRow(key: number) {
    setRows((r) => (r.length > 1 ? r.filter((row) => row.key !== key) : r));
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Title" required>
            <input
              name="title"
              type="text"
              required
              placeholder="e.g. Chicken & Veg Stir Fry"
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Servings">
          <input
            name="servings"
            type="number"
            min="1"
            defaultValue={1}
            className={inputClass}
          />
        </Field>
        <Field label="Calories per serving">
          <input
            name="calories_per_serving"
            type="number"
            min="0"
            className={inputClass}
          />
        </Field>
        <Field label="Protein per serving (g)">
          <input
            name="protein_g"
            type="number"
            step="0.1"
            min="0"
            className={inputClass}
          />
        </Field>
        <Field label="Source">
          <input
            name="source"
            type="text"
            placeholder="Cookbook, URL, your own…"
            className={inputClass}
          />
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-stone-700">
            Ingredients
          </span>
          <button
            type="button"
            onClick={addRow}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            + Add ingredient
          </button>
        </div>
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[1fr_5rem_5rem_auto] gap-2"
            >
              <input
                name="ingredient_name"
                type="text"
                placeholder="Ingredient"
                className={inputClass}
              />
              <input
                name="ingredient_quantity"
                type="number"
                step="0.01"
                min="0"
                placeholder="Qty"
                className={inputClass}
              />
              <input
                name="ingredient_unit"
                type="text"
                placeholder="Unit"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                aria-label="Remove ingredient"
                className="px-2 text-stone-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-stone-500">
          Blank rows are ignored.
        </p>
      </div>

      <Field label="Method">
        <textarea
          name="method"
          rows={5}
          placeholder="How to make it…"
          className={inputClass}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          name="is_public"
          className="h-4 w-4 rounded border-stone-300"
        />
        Share publicly (other Numa users can use this recipe)
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton pending={pending}>
        {pending ? "Saving…" : "Save recipe"}
      </SubmitButton>
    </form>
  );
}
