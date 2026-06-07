import { createClient } from "@/lib/supabase/server";
import { requireUser, getProfile } from "@/lib/auth/user";
import AppNav from "@/components/AppNav";
import { Card, PageHeader, EmptyState, DeleteButton } from "@/components/ui";
import PantryForm from "./PantryForm";
import { deleteInventoryItem } from "./actions";

function expiryBadge(expiresAt: string | null) {
  if (!expiresAt) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiresAt);
  const days = Math.round((exp.getTime() - today.getTime()) / 86400000);

  if (days < 0)
    return { text: "Expired", className: "bg-red-100 text-red-700" };
  if (days === 0)
    return { text: "Expires today", className: "bg-red-100 text-red-700" };
  if (days <= 3)
    return {
      text: `${days} day${days === 1 ? "" : "s"} left`,
      className: "bg-amber-100 text-amber-800",
    };
  return {
    text: `Expires ${exp.toLocaleDateString()}`,
    className: "bg-stone-100 text-stone-600",
  };
}

export default async function PantryPage() {
  await requireUser();
  const supabase = await createClient();
  const profile = await getProfile();

  const { data } = await supabase
    .from("inventory")
    .select("*")
    .order("expires_at", { ascending: true, nullsFirst: false })
    .order("item_name", { ascending: true });

  const items = data ?? [];

  return (
    <>
      <AppNav tier={profile?.tier} />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <PageHeader
            title="Pantry"
            subtitle="Track what's in your kitchen. Numa plans around it — using items nearing expiry first to cut waste."
          />

          <Card title="Add an item">
            <PantryForm />
          </Card>

          <Card title={`In your kitchen${items.length ? ` (${items.length})` : ""}`}>
            {items.length === 0 ? (
              <EmptyState>
                Your pantry is empty. Add items so Numa can plan around them.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-stone-100">
                {items.map((item) => {
                  const badge = expiryBadge(item.expires_at);
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-stone-900">
                            {item.item_name}
                          </span>
                          <span className="text-sm text-stone-500">
                            {Number(item.quantity)}
                            {item.unit ? ` ${item.unit}` : ""}
                          </span>
                          {item.category && (
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                              {item.category}
                            </span>
                          )}
                        </div>
                        {badge && (
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                          >
                            {badge.text}
                          </span>
                        )}
                      </div>
                      <form action={deleteInventoryItem}>
                        <input type="hidden" name="id" value={item.id} />
                        <DeleteButton />
                      </form>
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
