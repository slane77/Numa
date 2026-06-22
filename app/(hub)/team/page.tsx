import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/user";
import { getReports } from "@/lib/hr-data";

export const metadata = { title: "My team — The Hub" };

export default async function TeamPage() {
  const user = await requireUser();
  const reports = await getReports(user.id);
  if (reports.length === 0) redirect("/home");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          My team
        </h1>
        <p className="mt-1 text-stone-600">
          Your direct reports — open someone to manage appraisals, probation,
          return-to-work and TOIL.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-card">
        <ul className="divide-y divide-stone-100">
          {reports.map((p) => (
            <li key={p.id}>
              <Link
                href={`/hr/people/${p.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-stone-50"
              >
                <div>
                  <p className="font-medium text-stone-800">{p.name}</p>
                  <p className="text-sm text-stone-500">
                    {[p.job_title, p.department].filter(Boolean).join(" · ") ||
                      "—"}
                  </p>
                </div>
                <span className="text-stone-300">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
