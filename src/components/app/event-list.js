import Link from "next/link";
import { CircleCheck, CircleDot, GitCommitHorizontal, GitMerge, GitPullRequest, GitPullRequestClosed } from "lucide-react";
import { firstLine, formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/cn";

const TYPES = {
  commit: { icon: GitCommitHorizontal, verb: null, className: "text-fg-3" },
  pr_opened: { icon: GitPullRequest, verb: "Opened pull request", className: "text-good" },
  pr_merged: { icon: GitMerge, verb: "Merged pull request", className: "text-merged" },
  pr_closed: { icon: GitPullRequestClosed, verb: "Closed pull request", className: "text-critical" },
  issue_opened: { icon: CircleDot, verb: "Opened issue", className: "text-good" },
  issue_closed: { icon: CircleCheck, verb: "Closed issue", className: "text-merged" },
};

/**
 * Chronological feed of real GitHub events. Commit messages and titles are
 * shown exactly as written on GitHub.
 */
export function EventList({ events, showRepository = true, tz, now = new Date() }) {
  return (
    <ol className="relative">
      {events.map((event) => {
        const type = TYPES[event.type] || TYPES.commit;
        const Icon = type.icon;
        const title = event.type === "commit" ? firstLine(event.title) : event.title;
        return (
          <li key={event.id} className="flex gap-3 border-b border-border py-2.5 last:border-b-0">
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", type.className)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">
                {type.verb && (
                  <span className="text-fg-2">
                    {type.verb} <span className="tabular">#{event.number}</span>
                    {event.type === "pr_merged" && event.ref ? <span className="font-mono text-xs text-fg-3"> {event.ref}</span> : null}
                    {": "}
                  </span>
                )}
                {event.url ? (
                  <a href={event.url} target="_blank" rel="noreferrer" className="break-words hover:underline">
                    {title}
                  </a>
                ) : (
                  <span className="break-words">{title}</span>
                )}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-2xs text-fg-3">
                {showRepository && (
                  <Link href={`/repositories/${event.repositoryId}`} className="truncate hover:text-fg hover:underline">
                    {event.repository}
                  </Link>
                )}
                {event.sha && <span className="font-mono">{event.sha.slice(0, 7)}</span>}
                <time dateTime={new Date(event.at).toISOString()} title={formatDateTime(event.at, { tz })}>
                  {formatRelative(event.at, now)}
                </time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
