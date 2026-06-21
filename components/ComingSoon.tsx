import Link from "next/link";

/**
 * Placeholder for sections that are planned but not built yet, so the whole
 * vision is navigable while we build module by module.
 */
export default function ComingSoon({
  emoji,
  title,
  intro,
  features,
}: {
  emoji: string;
  title: string;
  intro: string;
  features: string[];
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-3xl">
        {emoji}
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          {title}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-stone-600">{intro}</p>
        <span className="mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
          Coming soon
        </span>
      </div>

      <ul className="mx-auto max-w-md space-y-2 text-left">
        {features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-3 rounded-xl border border-stone-200/80 bg-white px-4 py-3 text-sm text-stone-700 shadow-card"
          >
            <span className="text-brand-600">✓</span>
            {f}
          </li>
        ))}
      </ul>

      <Link
        href="/home"
        className="inline-block text-sm font-medium text-brand-700 hover:underline"
      >
        ← Back to the hub
      </Link>
    </div>
  );
}
