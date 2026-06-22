import Link from "next/link";
import { redirect } from "next/navigation";
import { isHr } from "@/lib/auth/user";
import { listStaff } from "@/lib/hr-data";

export const metadata = { title: "Staff — The Hub" };

export default async function HrPeoplePage() {
  if (!(await isHr())) redirect("/home");
  const staff = await listStaff();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/hr" className="text-sm text-stone-500 hover:text-stone-800">
          ← HR
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
          Staff records
        </h1>
        <p className="mt-1 text-stone-600">
          Open a person to see and manage their full HR record.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-card">
        <ul className="divide-y divide-stone-100">
          {staff.map((p) => (
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
