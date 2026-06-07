"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addPreference, type PreferenceActionState } from "./actions";
import { Field, SubmitButton, inputClass } from "@/components/ui";

export default function PreferenceForm() {
  const [state, formAction, pending] = useActionState<
    PreferenceActionState,
    FormData
  >(addPreference, null);
  const [kind, setKind] = useState("like");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Clear the uncontrolled fields after a successful add. The controlled
    // `kind` select intentionally stays put so users can add several of the
    // same type in a row.
    if (state && "ok" in state && state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-4 sm:grid-cols-[1fr_2fr_1fr_auto] sm:items-end"
    >
      <Field label="Type">
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className={inputClass}
        >
          <option value="like">Like</option>
          <option value="dislike">Dislike</option>
          <option value="allergy">Allergy</option>
          <option value="diet">Diet</option>
        </select>
      </Field>

      <Field label="Value">
        <input
          name="value"
          type="text"
          required
          placeholder={
            kind === "diet"
              ? "e.g. Vegetarian, Halal"
              : kind === "allergy"
                ? "e.g. Peanuts"
                : "e.g. Salmon"
          }
          className={inputClass}
        />
      </Field>

      <Field label="Severity">
        <select
          name="severity"
          defaultValue=""
          disabled={kind !== "allergy"}
          className={`${inputClass} disabled:bg-stone-100 disabled:text-stone-400`}
        >
          <option value="">—</option>
          <option value="mild">Mild</option>
          <option value="moderate">Moderate</option>
          <option value="severe">Severe</option>
        </select>
      </Field>

      <SubmitButton pending={pending}>
        {pending ? "Adding…" : "Add"}
      </SubmitButton>

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-4">
          {state.error}
        </p>
      )}
    </form>
  );
}
