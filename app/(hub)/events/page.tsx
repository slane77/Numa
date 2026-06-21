import Link from "next/link";
import { getEvents } from "@/lib/events";
import { isEditor } from "@/lib/auth/user";
import EventCard from "@/components/EventCard";

export const metadata = { title: "Events — The Hub" };

export default async function EventsPage() {
  const [{ upcoming, past }, canCreate] = await Promise.all([
    getEvents(),
    isEditor(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Events
          </h1>
          <p className="mt-1 text-stone-600">
            Socials, training and company get-togethers.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/events/new"
            className="shrink-0 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            🎉 New event
          </Link>
        )}
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-stone-900">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
            <p className="text-stone-600">Nothing in the diary yet.</p>
            {canCreate && (
              <Link
                href="/events/new"
                className="mt-3 inline-block rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                Create the first event
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-stone-900">
            Past events
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((e) => (
              <EventCard key={e.id} event={e} past />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
