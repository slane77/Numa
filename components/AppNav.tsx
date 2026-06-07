import Link from "next/link";
import { NavLink } from "@/components/ui";

/**
 * Top navigation for authenticated pages. Server component; sign-out posts to a
 * route handler so it works without client JS.
 */
export default function AppNav({ tier }: { tier?: "free" | "premium" }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
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
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/goals">Goals</NavLink>
          <NavLink href="/weight">Weight</NavLink>
          <NavLink href="/recipes">Recipes</NavLink>
          <NavLink href="/plans">Plans</NavLink>
          <NavLink href="/shopping">Shopping</NavLink>
          <NavLink href="/pantry">Pantry</NavLink>
          <NavLink href="/preferences">Preferences</NavLink>
          <NavLink href="/chat">Chat</NavLink>
          <NavLink href="/billing">Billing</NavLink>
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
