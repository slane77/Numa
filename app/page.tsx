import Link from "next/link";
import { getUser } from "@/lib/auth/user";

const FEATURES = [
  {
    title: "Pantry-aware planning",
    body: "Numa knows what's already in your kitchen and plans around it — so you buy less and bin less.",
  },
  {
    title: "Goals that actually move",
    body: "Set a weight, calorie or protein target and track your trend toward it over time.",
  },
  {
    title: "Smarter shopping",
    body: "Generate a shopping list of only what you're missing, organised for a single efficient trip.",
  },
];

export default async function Home() {
  const user = await getUser();

  return (
    <main className="flex-1">
      <header className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <span className="text-xl font-semibold tracking-tight text-brand-700">
          Numa
        </span>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
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
                className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="px-6 py-20 max-w-3xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900">
          Eat well. <span className="text-brand-600">Waste less.</span>
        </h1>
        <p className="mt-6 text-lg text-stone-600">
          Numa builds meal plans and shopping lists around what&apos;s already
          in your kitchen — cutting food waste and spend while you hit your
          health goals.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href={user ? "/dashboard" : "/login?mode=signup"}
            className="rounded-full bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
          >
            {user ? "Open Numa" : "Start free"}
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-stone-300 px-6 py-3 font-medium hover:border-stone-400"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="px-6 pb-24 max-w-5xl mx-auto grid gap-6 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-stone-200 bg-white p-6"
          >
            <h2 className="font-semibold text-stone-900">{f.title}</h2>
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
