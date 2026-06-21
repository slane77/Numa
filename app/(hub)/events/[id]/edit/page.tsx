import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getEvent } from "@/lib/events";
import { getUser, isAdmin } from "@/lib/auth/user";
import EventForm from "../../EventForm";
import { updateEvent } from "../../actions";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, user, admin] = await Promise.all([
    getEvent(id),
    getUser(),
    isAdmin(),
  ]);
  if (!event) notFound();

  const canManage = admin || (!!user && event.organiser_id === user.id);
  if (!canManage) redirect(`/events/${id}`);

  const action = updateEvent.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/events/${id}`}
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          ← Back to event
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
          Edit event
        </h1>
      </div>
      <EventForm action={action} event={event} submitLabel="Save changes" />
    </div>
  );
}
