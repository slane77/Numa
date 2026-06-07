"use client";

import { useActionState } from "react";
import { completeOnboarding, type OnboardingState } from "./actions";

const inputClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function OnboardingForm({
  defaultName,
}: {
  defaultName?: string;
}) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    null,
  );

  return (
    <form action={formAction} className="space-y-8">
      <Section title="About you">
        <Grid>
          <Field label="Name">
            <input
              name="display_name"
              type="text"
              defaultValue={defaultName ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Date of birth">
            <input name="dob" type="date" className={inputClass} />
          </Field>
          <Field label="Height (cm)">
            <input
              name="height_cm"
              type="number"
              step="0.1"
              min="0"
              className={inputClass}
            />
          </Field>
          <Field label="Sex">
            <select name="sex" defaultValue="" className={inputClass}>
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer_not">Prefer not to say</option>
            </select>
          </Field>
          <Field label="Activity level">
            <select
              name="activity_level"
              defaultValue="moderate"
              className={inputClass}
            >
              <option value="sedentary">Sedentary</option>
              <option value="light">Lightly active</option>
              <option value="moderate">Moderately active</option>
              <option value="active">Active</option>
              <option value="very_active">Very active</option>
            </select>
          </Field>
        </Grid>
      </Section>

      <Section title="Your first goal">
        <Grid>
          <Field label="Goal type">
            <select
              name="goal_type"
              defaultValue="weight_loss"
              className={inputClass}
            >
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
        </Grid>
      </Section>

      <Section title="Starting weight">
        <Grid>
          <Field label="Current weight (kg)" required>
            <input
              name="current_weight_kg"
              type="number"
              step="0.1"
              min="0"
              required
              className={inputClass}
            />
          </Field>
        </Grid>
      </Section>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-600 px-6 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Setting up…" : "Finish setup"}
      </button>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
