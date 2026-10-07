"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { formatRelative } from "@/lib/format";
import { SYNC_STAGES } from "@/lib/sync-stages";
import { cn } from "@/lib/cn";
import { useSyncStatus } from "./use-sync-status";

function stageLabel(job) {
  const stage = SYNC_STAGES.find((s) => s.key === job?.currentStage);
  if (!stage) return "Starting";
  const progress = job.stages?.[stage.key]?.progress;
  return progress ? `${stage.label} ${progress.done}/${progress.total}` : stage.label;
}

/**
 * Compact sync status for the app header. Triggers a background refresh
 * when data is stale, and refreshes the page when a sync completes.
 */
export function SyncIndicator({ initial, isDemo, className }) {
  const router = useRouter();
  const sync = useSyncStatus({ initial, auto: !isDemo, enabled: !isDemo, onComplete: () => router.refresh() });

  if (isDemo) {
    return <span className={cn("text-xs text-fg-3", className)}>Sample data</span>;
  }

  const failed = sync.job?.status === "failed";
  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <span className="hidden text-fg-3 sm:inline" aria-live="polite">
        {sync.active ? (
          <span className="text-fg-2">Syncing · {stageLabel(sync.job)}</span>
        ) : failed ? (
          <span className="inline-flex items-center gap-1 text-critical" title={sync.job.errorMessage}>
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Sync failed
          </span>
        ) : sync.lastSyncedAt ? (
          <>Synced {formatRelative(sync.lastSyncedAt)}</>
        ) : (
          "Not synced yet"
        )}
      </span>
      <button
        type="button"
        onClick={() => sync.start()}
        disabled={sync.active || sync.starting}
        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-2 font-medium text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-60"
        aria-label={sync.active ? "Sync in progress" : "Sync now"}
      >
        <RefreshCw className={cn("h-3.5 w-3.5", (sync.active || sync.starting) && "animate-spin")} aria-hidden="true" />
        <span className="hidden sm:inline">{sync.active ? "Syncing" : "Sync"}</span>
      </button>
      {sync.requestError && (
        <span role="alert" className="sr-only">
          {sync.requestError}
        </span>
      )}
    </div>
  );
}
