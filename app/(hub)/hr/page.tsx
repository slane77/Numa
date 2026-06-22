import Link from "next/link";
import { redirect } from "next/navigation";
import { isHr } from "@/lib/auth/user";
import { getHrDashboard } from "@/lib/hr-data";
import { formatDate } from "@/lib/hr";

export const metadata = { title: "HR — The Hub" };

const KIND_META: Record<string, { emoji: string; class: string }> = {
  probation: { emoji: "⏳", class: "bg-amber-100 text-amber-700" },
  appraisal: { emoji: "📋", class: "bg-sky-100 text-sky-700" },
  anniversary: { emoji: "🎉", class: "bg-rose-100 text-rose-700" },
};

export default async function HrDashboard() {
  if (!(await isHr())) redirect("/home");
  const items = await getHrDashboard();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            HR
          </h1>
          <p className="mt-1 text-stone-600">
            What needs attention, and the staff records.
          </p>
        </div>
        <Link
          href="/hr/people"
          className="shrink-0 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          All staff
        </Link>
      </div>

      <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-card">
        <h2 className="mb-4 font-semibold text-stone-900">Needs attention</h2>
        {items.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nothing due in the next 30–60 days. 🎉
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {items.map((it, i) => {
              const meta = KIND_META[it.kind];
              return (
                <li key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${meta.class}`}
                    >
                      {meta.emoji}
                    </span>
                    <div>
                      <Link
                        href={`/hr/people/${it.userId}`}
                        className="font-medium text-stone-800 hover:text-brand-700"
                      >
                        {it.name}
                      </Link>
                      <p className="text-sm text-stone-500">
                        {it.label} · {formatDate(it.date)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      it.overdue
                        ? "bg-rose-100 text-rose-700"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {it.overdue
                      ? `${Math.abs(it.days)}d overdue`
                      : it.days === 0
                        ? "today"
                        : `in ${it.days}d`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
