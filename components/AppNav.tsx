import Link from "next/link";
import Logo from "@/components/Logo";
import NavMenu from "@/components/NavMenu";

/**
 * Top navigation for authenticated pages. The link list collapses into a
 * hamburger menu on small screens (see NavMenu).
 */
export default function AppNav({ tier }: { tier?: "free" | "premium" }) {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/80 backdrop-blur">
      <div className="relative mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Logo markClass="h-7 w-7" textClass="text-lg" />
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
        <NavMenu />
      </div>
    </header>
  );
}
