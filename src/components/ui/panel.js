import { cn } from "@/lib/cn";

/**
 * A bordered region with an optional header. Used for charts and tables;
 * plain sections use spacing instead.
 */
export function Panel({ title, description, actions, children, className, bodyClassName, as: Tag = "section", id }) {
  return (
    <Tag className={cn("min-w-0 rounded-md border border-border bg-surface", className)} aria-labelledby={title && id ? `${id}-title` : undefined}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title && (
              <h2 id={id ? `${id}-title` : undefined} className="text-sm font-medium">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-xs text-fg-3">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </Tag>
  );
}
