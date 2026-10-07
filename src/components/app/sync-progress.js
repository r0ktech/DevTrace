"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Check, Circle, Loader2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SYNC_STAGES } from "@/lib/sync-stages";
import { formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useSyncStatus } from "./use-sync-status";

function StageIcon({ status }) {
  if (status === "done") return <Check className="h-4 w-4 text-good" aria-hidden="true" />;
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />;
  if (status === "failed") return <AlertTriangle className="h-4 w-4 text-critical" aria-hidden="true" />;
  if (status === "skipped") return <Minus className="h-4 w-4 text-fg-3" aria-hidden="true" />;
  return <Circle className="h-3 w-3 text-border-strong" aria-hidden="true" />;
}

function stageDetail(stage) {
  if (!stage) return "";
  if (stage.status === "running" && stage.progress) return `${stage.progress.done} of ${stage.progress.total} repositories`;
  if (stage.status === "done") {
    const parts = [formatNumber(stage.count ?? 0)];
    if (stage.skipped) parts.push(`${stage.skipped} skipped`);
    return parts.join(" · ");
  }
  if (stage.status === "failed") return "Failed";
  if (stage.status === "running") return "In progress";
  return "Waiting";
}

const STATUS_TEXT = { pending: "waiting", running: "in progress", done: "complete", failed: "failed" };

/**
 * Initial sync screen. Every row reflects the stored state of the real job;
 * nothing advances on a timer.
 */
export function SyncProgress({ initial, hasCompleted, login }) {
  const router = useRouter();
  const started = useRef(false);
  const sync = useSyncStatus({
    initial,
    onComplete: (data) => {
      if (data.job?.status === "completed") router.push("/dashboard");
    },
  });

  // Start the first sync automatically after connecting GitHub
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!hasCompleted && !initial.job) sync.start();
  }, [hasCompleted, initial.job, sync]);

  const job = sync.job;
  const failed = job?.status === "failed";
  const completed = job?.status === "completed";
  const stages = job?.stages || {};

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">
        {failed ? "Synchronization stopped" : completed ? "Your data is ready" : "Syncing your GitHub activity…"}
      </h1>
      <p className="mt-1.5 text-sm text-fg-3">
        {failed
          ? "Some of your data was saved. Retrying continues from where it stopped."
          : completed
            ? `Last synced ${formatRelative(sync.lastSyncedAt)}.`
            : `Reading repositories, commits, pull requests and issues${login ? ` for @${login}` : ""}. Large accounts can take a few minutes; you can leave this page open.`}
      </p>

      <ol className="mt-8 rounded-md border border-border bg-surface" aria-label="Sync stages">
        {SYNC_STAGES.map(({ key, label }) => {
          const stage = stages[key] || { status: "pending" };
          return (
            <li key={key} className="flex items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0">
              <StageIcon status={stage.status} />
              <span className={cn("flex-1", stage.status === "pending" && "text-fg-3")}>
                {label}
                <span className="sr-only"> — {STATUS_TEXT[stage.status] || stage.status}</span>
              </span>
              <span className="tabular text-xs text-fg-3">{stageDetail(stage)}</span>
            </li>
          );
        })}
      </ol>

      <div aria-live="polite" className="mt-6">
        {failed && (
          <div role="alert" className="rounded-md border border-critical/40 p-4">
            <p className="text-sm font-medium text-critical">
              {SYNC_STAGES.find((s) => stages[s.key]?.status === "failed")?.label || "Sync"} failed
            </p>
            <p className="mt-1 text-sm text-fg-2">{job.errorMessage}</p>
            {job.errorCode === "RATE_LIMITED" && job.retryAfter && (
              <p className="mt-1 text-xs text-fg-3">GitHub allows requests again around {new Date(job.retryAfter).toLocaleTimeString()}. Keep this page open and DevTrace will retry automatically.</p>
            )}
            <div className="mt-4 flex gap-2">
              <Button variant="primary" onClick={() => sync.start()} disabled={sync.starting}>
                {sync.starting ? "Retrying…" : "Retry sync"}
              </Button>
              {hasCompleted && (
                <Button asChild variant="ghost">
                  <Link href="/dashboard">Use existing data</Link>
                </Button>
              )}
            </div>
          </div>
        )}
        {!job && !sync.starting && (
          <Button variant="primary" onClick={() => sync.start()}>Start sync</Button>
        )}
        {completed && (
          <Button asChild variant="primary">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        )}
        {sync.requestError && <p role="alert" className="mt-3 text-sm text-critical">{sync.requestError}</p>}
      </div>
    </div>
  );
}
