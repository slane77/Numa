/** Numa wordmark with a leaf mark. Size the mark via `markClass`. */
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
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.27 1.34.27C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
        </svg>
      </span>
      <span className={`font-bold tracking-tight text-brand-700 ${textClass}`}>
        Numa
      </span>
    </span>
  );
}
