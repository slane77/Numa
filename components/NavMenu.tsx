"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/home", label: "Home" },
  { href: "/news", label: "News" },
  { href: "/guides", label: "Guides" },
  { href: "/events", label: "Events" },
  { href: "/calendar", label: "Who's in" },
  { href: "/holidays", label: "Holidays" },
];

function SignOut({ className }: { className?: string }) {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className={className ?? "text-stone-500 hover:text-stone-800"}
      >
        Sign out
      </button>
    </form>
  );
}

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Desktop: inline links */}
      <nav className="hidden items-center gap-5 text-sm lg:flex">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={
              isActive(l.href)
                ? "font-medium text-brand-700"
                : "text-stone-600 hover:text-brand-700"
            }
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/profile"
          className="text-stone-600 hover:text-brand-700"
        >
          Me
        </Link>
        <SignOut />
      </nav>

      {/* Mobile: hamburger toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-700 lg:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {/* Mobile: dropdown panel */}
      {open && (
        <div className="absolute inset-x-0 top-full z-40 border-b border-stone-200 bg-white shadow-card lg:hidden">
          <nav className="mx-auto flex max-w-5xl flex-col px-4 py-2">
            {[...LINKS, { href: "/profile", label: "Me" }].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-2 py-3 ${
                  isActive(l.href)
                    ? "font-medium text-brand-700"
                    : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-1 border-t border-stone-100 px-2 py-3">
              <SignOut className="text-stone-500 hover:text-stone-800" />
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
