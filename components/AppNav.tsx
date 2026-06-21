import Link from "next/link";
import Logo from "@/components/Logo";
import NavMenu from "@/components/NavMenu";
import type { Role } from "@/lib/auth/user";

/**
 * Top navigation for authenticated pages. The link list collapses into a
 * hamburger menu on small screens (see NavMenu).
 */
export default function AppNav({ role }: { role?: Role }) {
  const showBadge = role === "editor" || role === "admin";
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/80 backdrop-blur">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/home">
            <Logo markClass="h-8 w-8" textClass="text-base" />
          </Link>
          {showBadge && (
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium capitalize text-brand-700">
              {role}
            </span>
          )}
        </div>
        <NavMenu />
      </div>
    </header>
  );
}
