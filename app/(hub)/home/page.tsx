import Link from "next/link";
import { getProfile, getUser, firstName } from "@/lib/auth/user";
import { getFeedPosts } from "@/lib/posts";
import { getEvents } from "@/lib/events";
import PostCard from "@/components/PostCard";
import EventCard from "@/components/EventCard";
import { formatDate } from "@/lib/news";

const QUICK_LINKS = [
  { href: "/guides", emoji: "📘", label: "How-to guides" },
  { href: "/events", emoji: "🎉", label: "Events" },
  { href: "/calendar", emoji: "🏠", label: "Who's in" },
  { href: "/holidays", emoji: "🌴", label: "Book holiday" },
];

export default async function HomePage() {
  const [profile, user, posts, { upcoming }] = await Promise.all([
    getProfile(),
    getUser(),
    getFeedPosts(7),
    getEvents(),
  ]);
  const nextEvents = upcoming.slice(0, 3);
  const canPost = profile?.role === "editor" || profile?.role === "admin";
  const greetingName = firstName(profile, user?.email);

  const [featured, ...rest] = posts;
  const today = formatDate(new Date().toISOString());

  return (
    <div className="space-y-8">
      {/* Greeting hero */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 p-6 text-white shadow-card sm:p-8">
        <p className="text-sm text-brand-100">{today}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome back, {greetingName} 👋
        </h1>
        <p className="mt-2 max-w-xl text-brand-50">
          Everything Day Webster, in one place — the latest news, how-to guides,
          events and who&apos;s working where.
        </p>
        {canPost && (
          <Link
            href="/news/new"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition-colors hover:bg-brand-50"
          >
            ✏️ Post an update
          </Link>
        )}
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex flex-col items-start gap-2 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-card transition-shadow hover:shadow-lg"
          >
            <span className="text-2xl">{l.emoji}</span>
            <span className="text-sm font-medium text-stone-800">
              {l.label}
            </span>
          </Link>
        ))}
      </section>

      {/* Upcoming events */}
      {nextEvents.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-lg font-semibold text-stone-900">
              What&apos;s coming up
            </h2>
            <Link
              href="/events"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              All events
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {nextEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      {/* News */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Latest news</h2>
          <Link
            href="/news"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            View all
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
            <p className="text-stone-600">No news yet.</p>
            {canPost && (
              <Link
                href="/news/new"
                className="mt-3 inline-block rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                Write the first post
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {featured && <PostCard post={featured} featured />}
            {rest.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
