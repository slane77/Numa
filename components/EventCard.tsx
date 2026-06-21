import Link from "next/link";
import { formatEventWhen, type EventWithOrganiser } from "@/lib/events";

/** Compact event preview for the events index. */
export default function EventCard({
  event,
  past = false,
}: {
  event: EventWithOrganiser;
  past?: boolean;
}) {
  return (
    <Link
      href={`/events/${event.id}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-card transition-shadow hover:shadow-lg ${
        past ? "opacity-90" : ""
      }`}
    >
      <div className="h-36 overflow-hidden bg-gradient-to-br from-brand-600 to-brand-400">
        {event.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-medium text-brand-700">
          {formatEventWhen(event)}
        </p>
        <h3 className="mt-1 font-semibold text-stone-900 group-hover:text-brand-700">
          {event.title}
        </h3>
        {event.location && (
          <p className="mt-1 text-sm text-stone-500">📍 {event.location}</p>
        )}
        {!event.published && (
          <span className="mt-2 w-fit rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">
            Draft
          </span>
        )}
      </div>
    </Link>
  );
}
