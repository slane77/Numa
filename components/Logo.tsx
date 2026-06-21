/**
 * Day Webster "Hub" wordmark. The mark is a stylised hub/network node.
 * Size the mark via `markClass`.
 */
export default function Logo({
  className,
  markClass = "h-7 w-7",
  textClass = "text-xl",
}: {
  className?: string;
  markClass?: string;
  textClass?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <span
        className={`flex items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm ${markClass}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[60%] w-[60%]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
          <circle cx="5" cy="5" r="1.6" />
          <circle cx="19" cy="5" r="1.6" />
          <circle cx="5" cy="19" r="1.6" />
          <circle cx="19" cy="19" r="1.6" />
          <path d="M10.3 10.3 6.2 6.2M13.7 10.3l4.1-4.1M10.3 13.7l-4.1 4.1M13.7 13.7l4.1 4.1" />
        </svg>
      </span>
      <span className={`inline-flex flex-col leading-none ${textClass}`}>
        <span className="font-bold tracking-tight text-brand-700">
          The Hub
        </span>
        <span className="mt-0.5 text-[0.6em] font-medium uppercase tracking-[0.18em] text-stone-400">
          Day Webster
        </span>
      </span>
    </span>
  );
}
