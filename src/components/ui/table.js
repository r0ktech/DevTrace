import { cn } from "@/lib/cn";

// Tables scroll horizontally inside their container on small screens.
export function Table({ className, children, label }) {
  return (
    <div className="scrollbar-thin overflow-x-auto" role="region" aria-label={label} tabIndex={0}>
      <table className={cn("w-full border-collapse text-sm", className)}>{children}</table>
    </div>
  );
}

export function Th({ className, align = "left", children, ...props }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b border-border bg-surface px-4 py-2 text-2xs font-medium uppercase tracking-wide text-fg-3",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ className, align = "left", children, ...props }) {
  return (
    <td className={cn("border-b border-border px-4 py-2.5 align-top", align === "right" && "text-right tabular", className)} {...props}>
      {children}
    </td>
  );
}
