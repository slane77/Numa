import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUser, isHr as checkHr } from "@/lib/auth/user";
import { getPersonRecord } from "@/lib/hr-data";
import {
  formatDate,
  yearsOfService,
  toilBalanceLabel,
  APPRAISAL_STATUS_META,
} from "@/lib/hr";
import Section from "@/components/Section";
import DocumentList from "../../DocumentList";
import DocumentUpload from "../../DocumentUpload";
import {
  saveHrRecord,
  saveProbation,
  addAppraisal,
  completeAppraisal,
  deleteAppraisal,
  addRtw,
  addToil,
  deleteToil,
} from "../../actions";

const inputClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default async function PersonRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [me, viewerIsHr, rec] = await Promise.all([
    getUser(),
    checkHr(),
    getPersonRecord(id),
  ]);
  if (!rec.profile) notFound();

  const isManager = !!me && rec.profile.manager_id === me.id;
  if (!viewerIsHr && !isManager) {
    redirect(me?.id === id ? "/my-hr" : "/home");
  }

  const back = viewerIsHr ? "/hr/people" : "/team";

  return (
    <div className="space-y-6">
      <div>
        <Link href={back} className="text-sm text-stone-500 hover:text-stone-800">
          ← Back
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            {rec.profile.display_name ?? "Unnamed"}
          </h1>
          {!viewerIsHr && (
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
              Your report
            </span>
          )}
        </div>
        <p className="mt-1 text-stone-600">
          {[rec.profile.job_title, rec.profile.department]
            .filter(Boolean)
            .join(" · ") || "—"}
        </p>
      </div>

      {/* Employment & pay — HR only */}
      {viewerIsHr && (
        <Section title="Employment & pay" subtitle="Confidential — HR only">
          <form action={saveHrRecord} className="space-y-4">
            <input type="hidden" name="user_id" value={id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">
                  Start date
                </span>
                <input
                  type="date"
                  name="start_date"
                  defaultValue={rec.hr?.start_date ?? ""}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">
                  Employment type
                </span>
                <input
                  name="employment_type"
                  defaultValue={rec.hr?.employment_type ?? ""}
                  placeholder="e.g. Full-time"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">
                  Salary (£)
                </span>
                <input
                  type="number"
                  step="0.01"
                  name="salary"
                  defaultValue={rec.hr?.salary ?? ""}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">
                  Pay period
                </span>
                <select
                  name="pay_period"
                  defaultValue={rec.hr?.pay_period ?? "annual"}
                  className={inputClass}
                >
                  <option value="annual">Annual</option>
                  <option value="daily">Daily</option>
                  <option value="hourly">Hourly</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">
                  NI number
                </span>
                <input
                  name="ni_number"
                  defaultValue={rec.hr?.ni_number ?? ""}
                  className={inputClass}
                />
              </label>
              <div className="flex items-end">
                <p className="text-sm text-stone-500">
                  {rec.hr?.start_date
                    ? `${yearsOfService(rec.hr.start_date)} years' service · `
                    : ""}
                  TOIL {toilBalanceLabel(rec.toilBalance)}
                </p>
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">
                Notes
              </span>
              <textarea
                name="notes"
                rows={2}
                defaultValue={rec.hr?.notes ?? ""}
                className={`${inputClass} resize-y`}
              />
            </label>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                Save
              </button>
            </div>
          </form>
        </Section>
      )}

      {/* Personal details & NOK — HR only (read-only here) */}
      {viewerIsHr && (
        <Section title="Personal details & next of kin">
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Field label="DOB" value={formatDate(rec.personal?.dob ?? null)} />
            <Field label="Phone" value={rec.personal?.personal_phone ?? "—"} />
            <Field label="Email" value={rec.personal?.personal_email ?? "—"} />
            <Field
              label="Address"
              value={rec.personal?.home_address ?? "—"}
            />
          </dl>
          <div className="mt-4 border-t border-stone-100 pt-4">
            {rec.nok.length === 0 ? (
              <p className="text-sm text-stone-500">
                No emergency contacts on file.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {rec.nok.map((c) => (
                  <li key={c.id} className="text-stone-700">
                    <span className="font-medium">{c.name}</span>
                    {c.relationship ? ` (${c.relationship})` : ""} ·{" "}
                    {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      )}

      {/* Documents — HR only */}
      {viewerIsHr && (
        <Section title="Documents" subtitle="Stored privately, encrypted at rest">
          <div className="space-y-4">
            <DocumentList documents={rec.documents} canDelete />
            <DocumentUpload userId={id} />
          </div>
        </Section>
      )}

      {/* Probation — manager + HR */}
      <Section title="Probation">
        <form action={saveProbation} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="user_id" value={id} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-600">
              End date
            </span>
            <input
              type="date"
              name="end_date"
              defaultValue={rec.probation?.end_date ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-600">
              Status
            </span>
            <select
              name="status"
              defaultValue={rec.probation?.status ?? "pending"}
              className={inputClass}
            >
              <option value="pending">In progress</option>
              <option value="passed">Passed</option>
              <option value="extended">Extended</option>
              <option value="failed">Not passed</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-600">
              Notes
            </span>
            <input
              name="notes"
              defaultValue={rec.probation?.notes ?? ""}
              className={inputClass}
            />
          </label>
          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Save probation
            </button>
          </div>
        </form>
      </Section>

      {/* Appraisals — manager + HR */}
      <Section title="Appraisals">
        <div className="space-y-3">
          {rec.appraisals.length === 0 ? (
            <p className="text-sm text-stone-500">None recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {rec.appraisals.map((a) => {
                const meta = APPRAISAL_STATUS_META[a.status];
                return (
                  <li
                    key={a.id}
                    className="rounded-xl border border-stone-200 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-700">
                        {a.completed_at
                          ? `Completed ${formatDate(a.completed_at)}`
                          : `Due ${formatDate(a.due_date)}`}
                        {a.rating ? ` · ${a.rating}` : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.class}`}
                        >
                          {meta.label}
                        </span>
                        <form action={deleteAppraisal}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="user_id" value={id} />
                          <button
                            type="submit"
                            className="text-xs text-stone-400 hover:text-red-600"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                    {a.summary && (
                      <p className="mt-1 text-sm text-stone-500">{a.summary}</p>
                    )}
                    {a.status !== "completed" && (
                      <form
                        action={completeAppraisal}
                        className="mt-3 grid gap-2 border-t border-stone-100 pt-3 sm:grid-cols-[1fr_2fr_auto]"
                      >
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="user_id" value={id} />
                        <input
                          name="rating"
                          placeholder="Rating"
                          className={inputClass}
                        />
                        <input
                          name="summary"
                          placeholder="Summary"
                          className={inputClass}
                        />
                        <button
                          type="submit"
                          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                        >
                          Complete
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <form
            action={addAppraisal}
            className="grid gap-2 rounded-xl border border-dashed border-stone-300 p-4 sm:grid-cols-[1fr_1fr_auto]"
          >
            <input type="hidden" name="user_id" value={id} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-stone-600">
                Due date
              </span>
              <input type="date" name="due_date" className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-stone-600">
                Scheduled for (optional)
              </span>
              <input type="date" name="scheduled_for" className={inputClass} />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      </Section>

      {/* Return to work — manager + HR */}
      <Section title="Return-to-work interviews">
        <div className="space-y-3">
          {rec.rtw.length === 0 ? (
            <p className="text-sm text-stone-500">None recorded.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {rec.rtw.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-stone-200 px-4 py-3"
                >
                  <p className="text-stone-700">
                    Absence {formatDate(r.absence_start)} –{" "}
                    {formatDate(r.absence_end)}
                    {r.reason ? ` · ${r.reason}` : ""}
                  </p>
                  {r.notes && (
                    <p className="mt-1 text-stone-500">{r.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form
            action={addRtw}
            className="grid gap-2 rounded-xl border border-dashed border-stone-300 p-4 sm:grid-cols-2"
          >
            <input type="hidden" name="user_id" value={id} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-stone-600">
                Absence start
              </span>
              <input type="date" name="absence_start" className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-stone-600">
                Absence end
              </span>
              <input type="date" name="absence_end" className={inputClass} />
            </label>
            <input
              name="reason"
              placeholder="Reason"
              className={`${inputClass} sm:col-span-2`}
            />
            <textarea
              name="notes"
              rows={2}
              placeholder="Discussion notes"
              className={`${inputClass} resize-y sm:col-span-2`}
            />
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Log interview
              </button>
            </div>
          </form>
        </div>
      </Section>

      {/* TOIL — manager + HR */}
      <Section
        title="TOIL"
        subtitle={`Balance: ${toilBalanceLabel(rec.toilBalance)}`}
      >
        <div className="space-y-3">
          {rec.toil.length > 0 && (
            <ul className="space-y-1 text-sm">
              {rec.toil.slice(0, 8).map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2"
                >
                  <span className="text-stone-700">
                    {formatDate(t.entry_date)} ·{" "}
                    <span
                      className={
                        Number(t.hours) >= 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }
                    >
                      {Number(t.hours) >= 0 ? "+" : ""}
                      {t.hours} hrs
                    </span>
                    {t.reason ? ` · ${t.reason}` : ""}
                  </span>
                  <form action={deleteToil}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="user_id" value={id} />
                    <button
                      type="submit"
                      className="text-xs text-stone-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form
            action={addToil}
            className="grid gap-2 rounded-xl border border-dashed border-stone-300 p-4 sm:grid-cols-[auto_1fr_2fr_auto]"
          >
            <input type="hidden" name="user_id" value={id} />
            <select name="direction" className={inputClass} defaultValue="earned">
              <option value="earned">Earned</option>
              <option value="taken">Taken</option>
            </select>
            <input
              type="number"
              step="0.25"
              name="hours"
              placeholder="Hours"
              className={inputClass}
            />
            <input name="reason" placeholder="Reason" className={inputClass} />
            <button
              type="submit"
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Add
            </button>
          </form>
        </div>
      </Section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-stone-800">{value}</dd>
    </div>
  );
}
