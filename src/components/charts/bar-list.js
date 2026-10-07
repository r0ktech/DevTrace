import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Ranked horizontal bars in plain HTML: readable, accessible, and
 * consistent across themes. One colour for all bars unless each item is a
 * distinct entity with its own colour.
 */
export function BarList({ items, className, valueClassName }) {
  const max = Math.max(...items.map((i) => i.value), 0);
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item) => {
        const width = max ? Math.max(2, (item.value / max) * 100) : 0;
        const label = item.href ? (
          <Link href={item.href} className="truncate hover:underline">
            {item.label}
          </Link>
        ) : (
          <span className="truncate">{item.label}</span>
        );
        return (
          <li key={item.key || item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                {item.swatch && <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: item.swatch }} aria-hidden="true" />}
                {label}
              </span>
              <span className={cn("shrink-0 tabular text-xs text-fg-2", valueClassName)}>{item.display ?? item.value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-2" aria-hidden="true">
              <div className="h-full rounded-full" style={{ width: `${width}%`, background: item.color || "var(--series-1)" }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
