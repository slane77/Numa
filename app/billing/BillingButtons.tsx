"use client";

import { useState } from "react";

export default function BillingButtons({ isPremium }: { isPremium: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(endpoint: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data?.error ?? "Something went wrong.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div>
      {isPremium ? (
        <button
          type="button"
          onClick={() => go("/api/billing/portal")}
          disabled={loading}
          className="rounded-full border border-stone-300 px-5 py-2.5 font-medium text-stone-700 hover:border-stone-400 disabled:opacity-60"
        >
          {loading ? "Opening…" : "Manage subscription"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => go("/api/billing/checkout")}
          disabled={loading}
          className="rounded-full bg-brand-600 px-6 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Redirecting…" : "Upgrade to Premium — £4.99/mo"}
        </button>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
