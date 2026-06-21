import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { updatePerson } from "./actions";

export const metadata = { title: "People — The Hub" };

const selectClass =
  "rounded-lg border border-stone-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500";

export default async function AdminPeoplePage() {
  if (!(await isAdmin())) redirect("/home");

  const supabase = await createClient();
  const { data: people } = await supabase
    .from("profiles")
    .select("id, display_name, job_title, role, manager_id, annual_leave_days")
    .order("display_name");

  const everyone = people ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          People
        </h1>
        <p className="mt-1 text-stone-600">
          Set each person&apos;s role, line manager and annual leave allowance.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200/80 bg-white shadow-card">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-600">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Line manager</th>
              <th className="px-4 py-3 font-semibold">Allowance</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {everyone.map((p) => (
              <tr key={p.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3">
                  <form
                    id={`f-${p.id}`}
                    action={updatePerson}
                    className="contents"
                  >
                    <input type="hidden" name="id" value={p.id} />
                  </form>
                  <span className="font-medium text-stone-800">
                    {p.display_name ?? "Unnamed"}
                  </span>
                  {p.job_title && (
                    <span className="ml-2 text-xs text-stone-400">
                      {p.job_title}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    form={`f-${p.id}`}
                    name="role"
                    defaultValue={p.role}
                    className={selectClass}
                  >
                    <option value="employee">Employee</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    form={`f-${p.id}`}
                    name="manager_id"
                    defaultValue={p.manager_id ?? ""}
                    className={selectClass}
                  >
                    <option value="">— none —</option>
                    {everyone
                      .filter((m) => m.id !== p.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.display_name ?? "Unnamed"}
                        </option>
                      ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    form={`f-${p.id}`}
                    name="annual_leave_days"
                    type="number"
                    step="0.5"
                    min="0"
                    defaultValue={p.annual_leave_days}
                    className="w-20 rounded-lg border border-stone-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    form={`f-${p.id}`}
                    type="submit"
                    className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
