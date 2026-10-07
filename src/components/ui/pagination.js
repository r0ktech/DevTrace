import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { hrefWith } from "@/lib/url";
import { cn } from "@/lib/cn";

export function Pagination({ page, pageCount, total, pageSize, pathname, searchParams, noun = "results" }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const link = (target, disabled, children, label) =>
    disabled ? (
      <span aria-disabled="true" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-3/50">
        {children}
      </span>
    ) : (
      <Link
        href={hrefWith(pathname, searchParams, { page: target }, { resetPage: false })}
        scroll={false}
        aria-label={label}
        className={cn("flex h-7 w-7 items-center justify-center rounded-md border border-border-strong text-fg-2 hover:bg-surface-2")}
      >
        {children}
      </Link>
    );
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 border-t border-border px-4 py-2.5 text-xs text-fg-3">
      <span className="tabular">
        {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)} {noun}
      </span>
      <div className="flex items-center gap-1.5">
        {link(page - 1, page <= 1, <ChevronLeft className="h-3.5 w-3.5" />, "Previous page")}
        <span className="tabular px-1">
          {page} / {pageCount}
        </span>
        {link(page + 1, page >= pageCount, <ChevronRight className="h-3.5 w-3.5" />, "Next page")}
      </div>
    </nav>
  );
}
