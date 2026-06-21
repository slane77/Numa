import Link from "next/link";
import { requireUser } from "@/lib/auth/user";
import { workWeek, weekRangeLabel, LOCATION_META } from "@/lib/calendar";
import { getWeekBoard, getMyWeek } from "@/lib/calendar-data";
import MyWeek from "./MyWeek";

export const metadata = { title: "Who's in — The Hub" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const user = await requireUser();
  const { w } = await searchParams;
  const offset = Number.parseInt(w ?? "0", 10) || 0;

  const days = workWeek(offset);
  const [{ people, statuses }, mine] = await Promise.all([
    getWeekBoard(days),
    getMyWeek(user.id, days),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Who&apos;s working where
        </h1>
        <p className="mt-1 text-stone-600">
          Set where you&apos;re working and see the rest of the team at a glance.
        </p>
      </div>

      {/* Set my week */}
      <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-card">
        <h2 className="mb-3 font-semibold text-stone-900">
          My week — {weekRangeLabel(days)}
        </h2>
        <MyWeek days={days} initial={mine} />
        <p className="mt-3 text-xs text-stone-400">
          Tap an option to set it; tap it again to clear.
        </p>
      </section>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">The team</h2>
        <div className="flex items-center gap-1 text-sm">
          <Link
            href={`/calendar?w=${offset - 1}`}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-700 hover:border-stone-400"
          >
            ← Prev
          </Link>
          {offset !== 0 && (
            <Link
              href="/calendar"
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-700 hover:border-stone-400"
            >
              This week
            </Link>
          )}
          <Link
            href={`/calendar?w=${offset + 1}`}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-700 hover:border-stone-400"
          >
            Next →
          </Link>
        </div>
      </div>

      {/* Team board */}
      <section className="overflow-x-auto rounded-2xl border border-stone-200/80 bg-white shadow-card">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200">
              <th className="px-4 py-3 text-left font-semibold text-stone-700">
                {weekRangeLabel(days)}
              </th>
              {days.map((d) => (
                <th
                  key={d.iso}
                  className={`px-3 py-3 text-center font-semibold ${
                    d.isToday ? "bg-brand-50 text-brand-700" : "text-stone-600"
                  }`}
                >
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr
                key={p.id}
                className="border-b border-stone-100 last:border-0"
              >
                <td className="px-4 py-2.5">
                  <span className="font-medium text-stone-800">{p.name}</span>
                  {p.department && (
                    <span className="ml-2 text-xs text-stone-400">
                      {p.department}
                    </span>
                  )}
                </td>
                {days.map((d) => {
                  const loc = statuses.get(`${p.id}:${d.iso}`);
                  const meta = loc ? LOCATION_META[loc] : null;
                  return (
                    <td
                      key={d.iso}
                      className={`px-3 py-2.5 text-center ${
                        d.isToday ? "bg-brand-50/40" : ""
                      }`}
                    >
                      {meta ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.class}`}
                          title={meta.label}
                        >
                          {meta.emoji}
                          <span className="hidden sm:inline">{meta.short}</span>
                        </span>
                      ) : (
                        <span className="text-stone-300">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-stone-500">
        {Object.values(LOCATION_META).map((m) => (
          <span key={m.label} className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block h-3 w-3 rounded-full ${m.class}`}
            />
            {m.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="text-stone-300">·</span> Not set
        </span>
      </div>
    </div>
  );
}
