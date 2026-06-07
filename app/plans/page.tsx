import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getProfile } from "@/lib/auth/user";
import AppNav from "@/components/AppNav";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import PlanForm from "./PlanForm";

function dateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  return `${s.toLocaleDateString()} – ${e.toLocaleDateString()} · ${days} day${
    days === 1 ? "" : "s"
  }`;
}

export default async function PlansPage() {
  await requireUser();
  const supabase = await createClient();
  const profile = await getProfile();

  const { data: plans } = await supabase
    .from("meal_plans")
    .select("id, title, start_date, end_date, status")
    .order("start_date", { ascending: false });

  const rows = plans ?? [];

  return (
    <>
      <AppNav tier={profile?.tier} />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <PageHeader
            title="Meal plans"
            subtitle="Plan meals across a date range and assign recipes to each slot."
          />

          <Card title={`Your plans${rows.length ? ` (${rows.length})` : ""}`}>
            {rows.length === 0 ? (
              <EmptyState>No plans yet — create one below.</EmptyState>
            ) : (
              <ul className="space-y-3">
                {rows.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/plans/${p.id}`}
                      className="block rounded-xl border border-stone-200 p-4 transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <div className="font-medium text-stone-900">
                        {p.title || "Untitled plan"}
                      </div>
                      <div className="mt-0.5 text-sm text-stone-500">
                        {dateRange(p.start_date, p.end_date)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Create a plan">
            <PlanForm />
          </Card>
        </div>
      </main>
    </>
  );
}
