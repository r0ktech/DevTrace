import { cn } from "@/lib/cn";

const tones = {
  neutral: "border-border-strong text-fg-2",
  accent: "border-accent/40 text-accent-strong dark:text-accent",
  good: "border-good/40 text-good",
  critical: "border-critical/40 text-critical",
  merged: "border-merged/40 text-merged",
  warning: "border-warning/40 text-warning",
};

export function Badge({ tone = "neutral", className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-2xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
