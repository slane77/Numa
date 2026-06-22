"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { addNextOfKin, deleteNextOfKin, type SaveState } from "./actions";
import type { Tables } from "@/lib/types/database";

const inputClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Adding…" : "Add contact"}
    </button>
  );
}

export default function NextOfKin({
  contacts,
  canEdit,
}: {
  contacts: Tables<"next_of_kin">[];
  canEdit: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState<SaveState, FormData>(
    async (prev, form) => {
      const res = await addNextOfKin(prev, form);
      if (res && "ok" in res) formRef.current?.reset();
      return res;
    },
    null,
  );

  return (
    <div className="space-y-4">
      {contacts.length === 0 ? (
        <p className="text-sm text-stone-500">No emergency contacts yet.</p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3"
            >
              <div className="text-sm">
                <p className="font-medium text-stone-800">
                  {c.name}
                  {c.relationship && (
                    <span className="ml-2 font-normal text-stone-500">
                      {c.relationship}
                    </span>
                  )}
                </p>
                <p className="text-stone-500">
                  {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              {canEdit && (
                <form action={deleteNextOfKin}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="text-sm text-stone-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <form
          ref={formRef}
          action={action}
          className="grid gap-3 rounded-xl border border-dashed border-stone-300 p-4 sm:grid-cols-2"
        >
          <input name="name" required placeholder="Name" className={inputClass} />
          <input
            name="relationship"
            placeholder="Relationship (e.g. Partner)"
            className={inputClass}
          />
          <input name="phone" placeholder="Phone" className={inputClass} />
          <input name="email" placeholder="Email" className={inputClass} />
          {state && "error" in state && (
            <p className="text-sm text-red-700 sm:col-span-2">{state.error}</p>
          )}
          <div className="sm:col-span-2">
            <AddButton />
          </div>
        </form>
      )}
    </div>
  );
}
