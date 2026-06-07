"use client";

import { useState, useSyncExternalStore } from "react";
import { RETAILERS, getRetailer, type RetailerId } from "@/lib/retailers";
import { setItemPurchased } from "../actions";

type Item = {
  id: string;
  item_name: string;
  quantity: number | null;
  unit: string | null;
  purchased: boolean;
};

const STORAGE_KEY = "numa.retailer";

// Read the preferred retailer from localStorage without setState-in-effect, and
// stay SSR-safe (server snapshot is always the default).
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}
function useStoredRetailer(): [RetailerId, (id: RetailerId) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(STORAGE_KEY),
    () => null,
  );
  const id: RetailerId =
    raw && RETAILERS.some((r) => r.id === raw) ? (raw as RetailerId) : "tesco";
  const set = (next: RetailerId) => {
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event("storage"));
  };
  return [id, set];
}

export default function ShoppingItems({
  listId,
  items,
}: {
  listId: string;
  items: Item[];
}) {
  const [retailerId, chooseRetailer] = useStoredRetailer();
  const [copied, setCopied] = useState(false);

  const retailer = getRetailer(retailerId);

  async function copyList() {
    const text = items.map((i) => i.item_name).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        Nothing to buy — your pantry has it all covered. 🎉
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-stone-50 p-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-stone-700">Shop at</span>
          <select
            value={retailerId}
            onChange={(e) => chooseRetailer(e.target.value as RetailerId)}
            className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          >
            {RETAILERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={copyList}
          className="rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:border-stone-400"
        >
          {copied ? "Copied!" : "Copy list"}
        </button>
        <span className="text-xs text-stone-400">
          Tap “Find” to open each item in {retailer.name}&apos;s search.
        </span>
      </div>

      <ul className="divide-y divide-stone-100">
        {items.map((item) => {
          const qty = [item.quantity, item.unit]
            .filter((v) => v != null && v !== "")
            .join(" ");
          return (
            <li key={item.id} className="flex items-center gap-3 py-2.5">
              <form action={setItemPurchased} className="flex items-center">
                <input type="hidden" name="id" value={item.id} />
                <input
                  type="hidden"
                  name="shopping_list_id"
                  value={listId}
                />
                <input
                  type="hidden"
                  name="purchased"
                  value={(!item.purchased).toString()}
                />
                <button
                  type="submit"
                  aria-label={item.purchased ? "Mark not bought" : "Mark bought"}
                  className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                    item.purchased
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-stone-300"
                  }`}
                >
                  {item.purchased ? "✓" : ""}
                </button>
              </form>

              <span
                className={`flex-1 text-sm ${
                  item.purchased
                    ? "text-stone-400 line-through"
                    : "text-stone-800"
                }`}
              >
                {item.item_name}
              </span>

              {qty && <span className="text-sm text-stone-500">{qty}</span>}

              <a
                href={retailer.search(item.item_name)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
              >
                Find →
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
