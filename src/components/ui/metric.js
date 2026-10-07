import { cn } from "@/lib/cn";
import { formatSignedPercent, percentChangeOrNull } from "./metric-utils";

/**
 * Horizontal strip of key numbers, separated by hairlines instead of cards.
 */
export function MetricStrip({ children, className }) {
  return (
    <dl className={cn("metric-strip grid grid-cols-2 overflow-hidden rounded-md border border-border bg-surface sm:grid-cols-3 lg:grid-cols-5", className)}>
      {children}
    </dl>
  );
}

export function Metric({ label, value, hint, current, previous, comparisonLabel, className }) {
  const change = current != null && previous != null ? percentChangeOrNull(current, previous) : null;
  const signed = formatSignedPercent(change);
  return (
    <div className={cn("-mb-px -mr-px min-w-0 border-b border-r border-border px-4 py-3.5", className)}>
      <dt className="truncate text-xs text-fg-3">{label}</dt>
      <dd className="mt-1.5 text-2xl font-medium tracking-tight tabular">{value}</dd>
      <dd className="mt-1 min-h-4 truncate text-2xs text-fg-3">
        {signed ? (
          <>
            <span className={cn("font-medium", change > 0 ? "text-delta-up" : change < 0 ? "text-delta-down" : "text-fg-2")}>
              <span aria-hidden="true">{change > 0 ? "↑ " : change < 0 ? "↓ " : ""}</span>
              {signed}
            </span>{" "}
            {comparisonLabel}
          </>
        ) : (
          hint
        )}
      </dd>
    </div>
  );
}
