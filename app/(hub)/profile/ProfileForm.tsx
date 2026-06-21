"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfile, type ProfileActionState } from "./actions";
import type { Tables } from "@/lib/types/database";

const inputClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-brand-600 px-6 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700">
        {label}
      </span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

export default function ProfileForm({
  profile,
}: {
  profile: Tables<"profiles">;
}) {
  const [state, formAction] = useActionState<ProfileActionState, FormData>(
    updateProfile,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Name"
        name="display_name"
        defaultValue={profile.display_name}
        required
        placeholder="Your full name"
      />
      <Field
        label="Job title"
        name="job_title"
        defaultValue={profile.job_title}
        placeholder="e.g. Recruitment Consultant"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Department / team"
          name="department"
          defaultValue={profile.department}
          placeholder="e.g. Nursing"
        />
        <Field
          label="Location / office"
          name="location"
          defaultValue={profile.location}
          placeholder="e.g. London HQ"
        />
      </div>

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state && "ok" in state && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          Saved.
        </p>
      )}

      <div className="flex justify-end">
        <SaveButton />
      </div>
    </form>
  );
}
