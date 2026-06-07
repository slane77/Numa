import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getProfile } from "@/lib/auth/user";
import AppNav from "@/components/AppNav";
import { Card, PageHeader, EmptyState } from "@/components/ui";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  completed: "Completed",
  archived: "Archived",
};

export default async function ShoppingPage() {
  await requireUser();
  const supabase = await createClient();
  const profile = await getProfile();

  const { data: lists } = await supabase
    .from("shopping_lists")
    .select("id, title, status, created_at, shopping_list_items(count)")
    .order("created_at", { ascending: false });

  const rows = lists ?? [];

  return (
    <>
      <AppNav tier={profile?.tier} />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <PageHeader
            title="Shopping lists"
            subtitle="Generate a list from any meal plan — Numa leaves out what's already in your pantry."
          />

          <Card title={`Your lists${rows.length ? ` (${rows.length})` : ""}`}>
            {rows.length === 0 ? (
              <EmptyState>
                No lists yet. Open a meal plan and tap “Generate shopping list”.
              </EmptyState>
            ) : (
              <ul className="space-y-3">
                {rows.map((l) => {
                  const count =
                    (l.shopping_list_items as { count: number }[])?.[0]
                      ?.count ?? 0;
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/shopping/${l.id}`}
                        className="flex items-center justify-between rounded-xl border border-stone-200 p-4 transition hover:border-brand-300 hover:bg-brand-50"
                      >
                        <div>
                          <div className="font-medium text-stone-900">
                            {l.title || "Shopping list"}
                          </div>
                          <div className="mt-0.5 text-sm text-stone-500">
                            {count} item{count === 1 ? "" : "s"} ·{" "}
                            {new Date(l.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            l.status === "completed"
                              ? "bg-brand-100 text-brand-700"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {STATUS_LABELS[l.status] ?? l.status}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}
