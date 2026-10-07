import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getLastCompletedSync, getLatestSyncJob, serializeJob } from "@/server/sync/jobs";
import { describeSyncError } from "@/lib/sync-stages";
import { Logo } from "@/components/brand/logo";
import { SyncProgress } from "@/components/app/sync-progress";

export const metadata = { title: "Syncing" };
export const dynamic = "force-dynamic";

export default async function SyncPage() {
  const user = await requireUser();
  if (user.isDemo) redirect("/dashboard");
  const [latest, lastCompleted] = await Promise.all([getLatestSyncJob(user.id), getLastCompletedSync(user.id)]);
  const job = serializeJob(latest);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Logo className="mb-10" />
        <SyncProgress
          login={user.github?.login}
          hasCompleted={Boolean(lastCompleted)}
          initial={{
            job: job && { ...job, errorMessage: job.status === "failed" ? describeSyncError(job.errorCode) : null },
            lastSyncedAt: lastCompleted?.finishedAt?.toISOString() || null,
          }}
        />
      </div>
    </div>
  );
}
