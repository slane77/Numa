import Link from "next/link";

/**
 * Top navigation for authenticated pages. Server component; sign-out posts to a
 * route handler so it works without client JS.
 */
export default function AppNav({ tier }: { tier?: "free" | "premium" }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight text-brand-700"
          >
            Numa
          </Link>
          {tier && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                tier === "premium"
                  ? "bg-brand-100 text-brand-700"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              {tier === "premium" ? "Premium" : "Free"}
            </span>
          )}
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="hover:text-brand-700">
            Dashboard
          </Link>
          <Link href="/weight" className="hover:text-brand-700">
            Weight
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-stone-500 hover:text-stone-800"
            >
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
