import { cn } from "@/lib/cn";

/** Floating tooltip positioned relative to a container. */
export function FloatingTooltip({ tip, className }) {
  if (!tip) return null;
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
        className,
      )}
      style={{ left: tip.x, top: tip.y - 6 }}
    >
      {tip.content}
    </div>
  );
}
