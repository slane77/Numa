import Link from "next/link";
import { getUser } from "@/lib/auth/user";
import Logo from "@/components/Logo";

const FEATURES = [
  {
    emoji: "🧊",
    title: "Pantry-aware planning",
    body: "Numa knows what's already in your kitchen and plans around it — so you buy less and bin less.",
  },
  {
    emoji: "🎯",
    title: "Goals that actually move",
    body: "Set a weight, calorie or protein target and track your trend toward it over time.",
  },
  {
    emoji: "🛒",
    title: "Smarter shopping",
    body: "Generate a list of only what you're missing, then jump straight to your supermarket.",
  },
];

export default async function Home() {
  const user = await getUser();

  return (
    <main className="flex-1">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="font-medium hover:text-brand-700">
                Sign in
              </Link>
              <Link
                href="/login?mode=signup"
                className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 via-stone-50 to-stone-50" />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-sm font-medium text-brand-700">
            🌱 Eat well, waste less
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-stone-900 sm:text-6xl">
            Meal planning that knows{" "}
            <span className="text-brand-600">your kitchen</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-stone-600">
            Numa builds meal plans and shopping lists around what you already
            have — cutting food waste and spend while you hit your health goals.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href={user ? "/dashboard" : "/login?mode=signup"}
              className="rounded-full bg-brand-600 px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              {user ? "Open Numa" : "Start free"}
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-stone-300 bg-white px-6 py-3 font-medium transition-colors hover:border-stone-400"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-sm text-stone-500">
            Free weight tracking, manual planning &amp; shopping lists — no card
            needed.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-card"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-2xl">
              {f.emoji}
            </div>
            <h2 className="mt-4 font-semibold text-stone-900">{f.title}</h2>
            <p className="mt-2 text-sm text-stone-600">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-stone-200 px-6 py-8 text-center text-sm text-stone-500">
        Numa — free weight tracking &amp; manual meal planning. Premium adds AI
        meal planning and pantry intelligence.
      </footer>
    </main>
  );
}
