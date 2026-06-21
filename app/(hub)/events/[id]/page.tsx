import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getEvent,
  getRsvps,
  getEventMedia,
  formatEventWhen,
} from "@/lib/events";
import { getUser, isAdmin } from "@/lib/auth/user";
import RsvpButtons from "../RsvpButtons";
import GalleryUploader from "../GalleryUploader";
import { deleteEvent, deleteEventMedia } from "../actions";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  const [event, admin, rsvps, media] = await Promise.all([
    getEvent(id),
    isAdmin(),
    getRsvps(id, user?.id),
    getEventMedia(id),
  ]);
  if (!event) notFound();

  const canManage = admin || (!!user && event.organiser_id === user.id);
  const paragraphs = event.description
    .split(/\n{2,}/)
    .filter((p) => p.trim());

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/events"
        className="text-sm text-stone-500 hover:text-stone-800"
      >
        ← Back to events
      </Link>

      {event.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_image_url}
          alt=""
          className="max-h-80 w-full rounded-2xl object-cover"
        />
      )}

      <header className="space-y-2">
        {!event.published && (
          <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-600">
            Draft
          </span>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          {event.title}
        </h1>
        <p className="font-medium text-brand-700">{formatEventWhen(event)}</p>
        {event.location && <p className="text-stone-600">📍 {event.location}</p>}
        {event.organiserName && (
          <p className="text-sm text-stone-500">
            Organised by {event.organiserName}
          </p>
        )}
      </header>

      {/* RSVP */}
      <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">Are you coming?</h2>
          <p className="text-sm text-stone-500">
            {rsvps.counts.going} going · {rsvps.counts.maybe} maybe
          </p>
        </div>
        <RsvpButtons eventId={event.id} mine={rsvps.mine} />
        {rsvps.going.length > 0 && (
          <p className="mt-3 text-sm text-stone-600">
            <span className="font-medium">Going:</span>{" "}
            {rsvps.going.map((p) => p.name).join(", ")}
          </p>
        )}
      </section>

      {/* Details */}
      {paragraphs.length > 0 && (
        <div className="prose-hub max-w-none text-stone-800">
          {paragraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}

      {/* Gallery */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Gallery</h2>
          <GalleryUploader eventId={event.id} />
        </div>
        {media.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
            No photos yet — be the first to add some.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {media.map((m) => (
              <div
                key={m.id}
                className="group relative overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
              >
                {m.kind === "video" ? (
                  <video src={m.url} controls className="h-40 w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.url}
                    alt={m.caption ?? ""}
                    className="h-40 w-full object-cover"
                  />
                )}
                {(canManage || (user && m.uploaded_by === user.id)) && (
                  <form action={deleteEventMedia} className="absolute right-1 top-1">
                    <input type="hidden" name="media_id" value={m.id} />
                    <input type="hidden" name="event_id" value={event.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {canManage && (
        <div className="flex items-center gap-3 border-t border-stone-200 pt-5">
          <Link
            href={`/events/${event.id}/edit`}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-400"
          >
            Edit
          </Link>
          <form action={deleteEvent}>
            <input type="hidden" name="id" value={event.id} />
            <button
              type="submit"
              className="rounded-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
