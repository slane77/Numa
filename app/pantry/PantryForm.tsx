"use client";

import { useActionState, useEffect, useRef } from "react";
import { addInventoryItem, type PantryActionState } from "./actions";
import { Field, SubmitButton, inputClass } from "@/components/ui";

export default function PantryForm() {
  const [state, formAction, pending] = useActionState<
    PantryActionState,
    FormData
  >(addInventoryItem, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Item" required>
          <input
            name="item_name"
            type="text"
            required
            placeholder="e.g. Chicken breast"
            className={inputClass}
          />
        </Field>
        <Field label="Quantity">
          <input
            name="quantity"
            type="number"
            step="0.01"
            min="0"
            defaultValue={1}
            className={inputClass}
          />
        </Field>
        <Field label="Unit">
          <input
            name="unit"
            type="text"
            placeholder="g, ml, pcs…"
            className={inputClass}
          />
        </Field>
        <Field label="Category">
          <input
            name="category"
            type="text"
            placeholder="Produce, Dairy…"
            className={inputClass}
          />
        </Field>
        <Field label="Expires">
          <input name="expires_at" type="date" className={inputClass} />
        </Field>
      </div>

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton pending={pending}>
        {pending ? "Adding…" : "Add to pantry"}
      </SubmitButton>
    </form>
  );
}
