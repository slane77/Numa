/**
 * Day Webster Group logo, with a small "The Hub" label so it reads as the
 * intranet. Size it via `className` height (e.g. "h-7"); the image scales to
 * fit and the label tags it as the Hub. Pass `showHub={false}` for the bare logo.
 */
export default function Logo({
  className,
  showHub = true,
}: {
  className?: string;
  showHub?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? "h-7"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/day-webster-logo.png"
        alt="Day Webster Group"
        className="h-full w-auto"
      />
      {showHub && (
        <span className="self-center whitespace-nowrap border-l border-stone-300 pl-2.5 text-sm font-semibold text-stone-500">
          The Hub
        </span>
      )}
    </span>
  );
}
