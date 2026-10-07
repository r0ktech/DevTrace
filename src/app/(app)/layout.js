import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeSync } from "@/components/app/theme-toggle";
import { TimezoneSync } from "@/components/app/timezone-sync";
import { requireUser } from "@/server/auth/session";
import { getPreferences } from "@/server/services/preferences";
import { getLastCompletedSync, getLatestSyncJob, serializeJob } from "@/server/sync/jobs";
import { describeSyncError } from "@/lib/sync-stages";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }) {
  const user = await requireUser();
  const [prefs, latest, lastCompleted] = await Promise.all([
    getPreferences(user.id),
    getLatestSyncJob(user.id),
    getLastCompletedSync(user.id),
  ]);

  // New accounts go through the initial sync screen first
  if (!user.isDemo && !lastCompleted) redirect("/sync");

  const job = serializeJob(latest);
  const syncState = {
    job: job && { ...job, errorMessage: job.status === "failed" ? describeSyncError(job.errorCode) : null },
    lastSyncedAt: lastCompleted?.finishedAt?.toISOString() || null,
  };

  return (
    <AppShell account={user.github} isDemo={user.isDemo} syncState={syncState}>
      <ThemeSync preferred={prefs.theme} />
      <TimezoneSync current={prefs.timezone} enabled={!user.isDemo} />
      {children}
    </AppShell>
  );
}
