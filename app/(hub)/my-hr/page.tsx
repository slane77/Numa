import { requireUser } from "@/lib/auth/user";
import { getPersonRecord } from "@/lib/hr-data";
import { formatMoney, formatDate, yearsOfService, toilBalanceLabel } from "@/lib/hr";
import { APPRAISAL_STATUS_META, PROBATION_STATUS_META } from "@/lib/hr";
import Section from "@/components/Section";
import PersonalDetailsForm from "./PersonalDetailsForm";
import NextOfKin from "./NextOfKin";
import DocumentList from "../hr/DocumentList";

export const metadata = { title: "My HR — The Hub" };

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-stone-800">{value}</dd>
    </div>
  );
}

export default async function MyHrPage() {
  const user = await requireUser();
  const rec = await getPersonRecord(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          My HR
        </h1>
        <p className="mt-1 text-stone-600">
          Your personal details, emergency contacts, documents and records.
        </p>
      </div>

      {/* Employment summary (read-only) */}
      <Section title="Employment" subtitle="Maintained by HR">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Detail label="Start date" value={formatDate(rec.hr?.start_date ?? null)} />
          <Detail
            label="Service"
            value={
              rec.hr?.start_date
                ? `${yearsOfService(rec.hr.start_date)} yrs`
                : "—"
            }
          />
          <Detail label="Type" value={rec.hr?.employment_type ?? "—"} />
          <Detail
            label="Salary"
            value={formatMoney(rec.hr?.salary ?? null, rec.hr?.pay_period)}
          />
        </dl>
        <p className="mt-3 text-xs text-stone-400">
          TOIL balance: {toilBalanceLabel(rec.toilBalance)}
        </p>
      </Section>

      {/* Personal details */}
      <Section
        title="Personal details"
        subtitle="Only you and HR can see these"
      >
        <PersonalDetailsForm details={rec.personal} />
      </Section>

      {/* Next of kin */}
      <Section title="Emergency contacts">
        <NextOfKin contacts={rec.nok} canEdit />
      </Section>

      {/* Documents */}
      <Section title="My documents" subtitle="Shared with you by HR">
        <DocumentList documents={rec.documents} canDelete={false} />
      </Section>

      {/* Appraisals & probation (read-only summaries) */}
      <Section title="Appraisals">
        {rec.appraisals.length === 0 ? (
          <p className="text-sm text-stone-500">No appraisals recorded.</p>
        ) : (
          <ul className="space-y-2">
            {rec.appraisals.map((a) => {
              const meta = APPRAISAL_STATUS_META[a.status];
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 text-sm"
                >
                  <span className="text-stone-700">
                    {a.completed_at
                      ? `Completed ${formatDate(a.completed_at)}`
                      : `Due ${formatDate(a.due_date)}`}
                    {a.rating ? ` · ${a.rating}` : ""}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.class}`}
                  >
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {rec.probation?.end_date && (
        <Section title="Probation">
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-700">
              Ends {formatDate(rec.probation.end_date)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                PROBATION_STATUS_META[rec.probation.status]?.class ?? ""
              }`}
            >
              {PROBATION_STATUS_META[rec.probation.status]?.label ??
                rec.probation.status}
            </span>
          </div>
        </Section>
      )}
    </div>
  );
}
