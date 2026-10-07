import { AlertTriangle, Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

export function EmptyState({ title, description, action, className, icon: Icon = Inbox, compact = false }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "py-8" : "py-14", className)}>
      <Icon className="mb-3 h-5 w-5 text-fg-3" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, description, action, className }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <AlertTriangle className="mb-3 h-5 w-5 text-critical" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-fg-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn("animate-soft-pulse rounded-[4px] bg-surface-2", className)} aria-hidden="true" />;
}
