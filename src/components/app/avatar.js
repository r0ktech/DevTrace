import { cn } from "@/lib/cn";

/** GitHub avatar with an initials fallback (used for the demo account). */
export function Avatar({ src, name, size = 32, className }) {
  const initials = String(name || "?")
    .split(/[\s-_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const style = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} style={style} className={cn("shrink-0 rounded-full border border-border bg-surface-2", className)} />;
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...style, fontSize: Math.max(10, size * 0.38) }}
      className={cn("flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-3 font-medium text-fg-2", className)}
    >
      {initials}
    </span>
  );
}
