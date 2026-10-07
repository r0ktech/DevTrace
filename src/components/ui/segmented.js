import Link from "next/link";
import { cn } from "@/lib/cn";
import { hrefWith } from "@/lib/url";

/**
 * Segmented control backed by URL search params, so state is shareable,
 * server-rendered, and works without client JavaScript.
 */
export function SegmentedLinks({ label, options, param, value, pathname, searchParams }) {
  return (
    <nav aria-label={label} className="inline-flex h-8 items-center rounded-md border border-border-strong bg-surface p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Link
            key={option.value}
            href={hrefWith(pathname, searchParams, { [param]: option.value })}
            scroll={false}
            replace
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex h-full items-center rounded-[4px] px-2.5 text-xs font-medium transition-colors",
              active ? "bg-surface-3 text-fg" : "text-fg-3 hover:text-fg",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
