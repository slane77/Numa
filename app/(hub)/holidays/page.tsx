import { requireUser, getProfile } from "@/lib/auth/user";
import {
  getLeaveSummary,
  getMyRequests,
  getApprovalQueue,
} from "@/lib/holidays-data";
import {
  HOLIDAY_STATUS_META,
  formatDateRange,
  plural,
} from "@/lib/holidays";
import RequestForm from "./RequestForm";
import { cancelHoliday, decideHoliday } from "./actions";

export const metadata = { title: "Holidays — The Hub" };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-4 text-center shadow-card">
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </p>
    </div>
  );
}

export default async function HolidaysPage() {
  const user = await requireUser();
  const profile = await getProfile();
  const allowance = profile?.annual_leave_days ?? 25;

  const [summary, mine, queue] = await Promise.all([
    getLeaveSummary(user.id, allowance),
    getMyRequests(user.id),
    getApprovalQueue(user.id),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Holidays
        </h1>
        <p className="mt-1 text-stone-600">
          Your allowance for {summary.yearLabel}, and your requests.
        </p>
      </div>

      {/* Allowance summary */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Allowance" value={plural(summary.allowance, "day")} />
        <Stat label="Booked" value={plural(summary.approved, "day")} />
        <Stat label="Pending" value={plural(summary.pending, "day")} />
        <Stat label="Remaining" value={plural(summary.remaining, "day")} />
      </section>

      {/* Manager: approvals awaiting you */}
      {queue.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-900">
            Awaiting your approval
          </h2>
          {queue.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-stone-900">{r.personName}</p>
                  <p className="text-sm text-stone-600">
                    {formatDateRange(r.start_date, r.end_date)} ·{" "}
                    {plural(Number(r.working_days), "day")}
                  </p>
                  {r.note && (
                    <p className="mt-1 text-sm text-stone-500">“{r.note}”</p>
                  )}
                </div>
                <form
                  action={decideHoliday}
                  className="flex flex-col items-end gap-2"
                >
                  <input type="hidden" name="id" value={r.id} />
                  <input
                    name="decision_note"
                    placeholder="Optional note"
                    className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      name="decision"
                      value="declined"
                      className="rounded-full border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:border-stone-400"
                    >
                      Decline
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="approved"
                      className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Request form */}
      <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-card">
        <h2 className="mb-4 font-semibold text-stone-900">Request time off</h2>
        <RequestForm remaining={summary.remaining} />
      </section>

      {/* My requests */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-900">My requests</h2>
        {mine.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-stone-600">
            No requests yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {mine.map((r) => {
              const meta = HOLIDAY_STATUS_META[r.status];
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200/80 bg-white px-4 py-3 shadow-card"
                >
                  <div>
                    <p className="font-medium text-stone-800">
                      {formatDateRange(r.start_date, r.end_date)}
                    </p>
                    <p className="text-sm text-stone-500">
                      {plural(Number(r.working_days), "day")}
                      {r.note ? ` · ${r.note}` : ""}
                      {r.decision_note ? ` · Manager: “${r.decision_note}”` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.class}`}
                    >
                      {meta.label}
                    </span>
                    {r.status === "pending" && (
                      <form action={cancelHoliday}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="text-sm font-medium text-stone-400 hover:text-red-600"
                        >
                          Cancel
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
