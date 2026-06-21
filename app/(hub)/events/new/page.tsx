import Link from "next/link";
import { redirect } from "next/navigation";
import { isEditor } from "@/lib/auth/user";
import EventForm from "../EventForm";
import { createEvent } from "../actions";

export const metadata = { title: "New event — The Hub" };

export default async function NewEventPage() {
  if (!(await isEditor())) redirect("/events");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/events"
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          ← Back to events
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
          Create an event
        </h1>
      </div>
      <EventForm action={createEvent} submitLabel="Create event" />
    </div>
  );
}
