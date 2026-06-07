import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getProfile } from "@/lib/auth/user";
import AppNav from "@/components/AppNav";
import { Card } from "@/components/ui";
import {
  setItemPurchased,
  setListStatus,
  deleteShoppingList,
} from "../actions";
import type { Tables } from "@/lib/types/database";

type Item = Tables<"shopping_list_items">;

function qtyLabel(item: Item) {
  const q = item.quantity != null ? Number(item.quantity) : null;
  return [q, item.unit].filter((v) => v != null && v !== "").join(" ");
}

export default async function ShoppingListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getProfile();

  const { data: list } = await supabase
    .from("shopping_lists")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!list) notFound();

  const { data: itemsData } = await supabase
    .from("shopping_list_items")
    .select("*")
    .eq("shopping_list_id", id)
    .order("item_name", { ascending: true });

  const items = itemsData ?? [];
  const toBuy = items.filter((i) => !i.have_in_pantry);
  const haveAlready = items.filter((i) => i.have_in_pantry);
  const boughtCount = toBuy.filter((i) => i.purchased).length;

  return (
    <>
      <AppNav tier={profile?.tier} />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <Link
            href="/shopping"
            className="text-sm text-brand-700 hover:underline"
          >
            ← All lists
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                {list.title || "Shopping list"}
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                {boughtCount}/{toBuy.length} bought
                {haveAlready.length > 0 &&
                  ` · ${haveAlready.length} already in pantry`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {list.status !== "completed" ? (
                <form action={setListStatus}>
                  <input type="hidden" name="id" value={list.id} />
                  <input type="hidden" name="status" value="completed" />
                  <button
                    type="submit"
                    className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    Mark complete
                  </button>
                </form>
              ) : (
                <form action={setListStatus}>
                  <input type="hidden" name="id" value={list.id} />
                  <input type="hidden" name="status" value="open" />
                  <button
                    type="submit"
                    className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:border-stone-400"
                  >
                    Reopen
                  </button>
                </form>
              )}
              <form action={deleteShoppingList}>
                <input type="hidden" name="id" value={list.id} />
                <button
                  type="submit"
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:border-red-300 hover:text-red-600"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>

          <Card title={`To buy (${toBuy.length})`}>
            {toBuy.length === 0 ? (
              <p className="text-sm text-stone-500">
                Nothing to buy — your pantry has it all covered. 🎉
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {toBuy.map((item) => (
                  <li key={item.id} className="py-2.5">
                    <form
                      action={setItemPurchased}
                      className="flex items-center gap-3"
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <input
                        type="hidden"
                        name="shopping_list_id"
                        value={list.id}
                      />
                      <input
                        type="hidden"
                        name="purchased"
                        value={(!item.purchased).toString()}
                      />
                      <button
                        type="submit"
                        aria-label={
                          item.purchased ? "Mark not bought" : "Mark bought"
                        }
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          item.purchased
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-stone-300"
                        }`}
                      >
                        {item.purchased ? "✓" : ""}
                      </button>
                      <span
                        className={`flex-1 text-sm ${
                          item.purchased
                            ? "text-stone-400 line-through"
                            : "text-stone-800"
                        }`}
                      >
                        {item.item_name}
                      </span>
                      <span className="text-sm text-stone-500">
                        {qtyLabel(item)}
                      </span>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {haveAlready.length > 0 && (
            <Card title={`Already in your pantry (${haveAlready.length})`}>
              <ul className="flex flex-wrap gap-2">
                {haveAlready.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-600"
                  >
                    {item.item_name}
                    {qtyLabel(item) && (
                      <span className="text-stone-400"> · {qtyLabel(item)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
