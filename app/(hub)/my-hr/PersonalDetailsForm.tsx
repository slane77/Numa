"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { savePersonalDetails, type SaveState } from "./actions";
import type { Tables } from "@/lib/types/database";

const inputClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export default function PersonalDetailsForm({
  details,
}: {
  details: Tables<"personal_details"> | null;
}) {
  const [state, action] = useActionState<SaveState, FormData>(
    savePersonalDetails,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Date of birth
          </span>
          <input
            type="date"
            name="dob"
            defaultValue={details?.dob ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Personal phone
          </span>
          <input
            name="personal_phone"
            defaultValue={details?.personal_phone ?? ""}
            className={inputClass}
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Personal email
        </span>
        <input
          type="email"
          name="personal_email"
          defaultValue={details?.personal_email ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Home address
        </span>
        <textarea
          name="home_address"
          rows={3}
          defaultValue={details?.home_address ?? ""}
          className={`${inputClass} resize-y`}
        />
      </label>

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state && "ok" in state && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Saved.
        </p>
      )}

      <div className="flex justify-end">
        <SaveButton />
      </div>
    </form>
  );
}
