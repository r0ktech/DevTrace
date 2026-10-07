import { cn } from "@/lib/cn";

/** DevTrace mark: a single trace line inside a square. */
export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("h-6 w-6 shrink-0", className)}>
      <rect width="32" height="32" rx="7" className="fill-fg" />
      <path
        d="M7 20h5l3-8 4 12 3-7h3"
        fill="none"
        className="stroke-[var(--accent-strong)] dark:stroke-[var(--accent)]"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-mono text-[15px] font-medium tracking-tight">devtrace</span>
    </span>
  );
}
