import prisma from "@/server/db";
import { apiHandler, jsonError } from "@/server/http";
import { enqueueSync, getLastCompletedSync, serializeJob } from "@/server/sync/jobs";
import { retryIfRateLimitExpired, startSyncInBackground } from "@/server/sync/run";
import { describeSyncError } from "@/lib/sync-stages";

// Background refresh when the newest data is older than this
const AUTO_SYNC_AFTER_MS = 12 * 60 * 60_000;

function present(job, lastCompleted) {
  const serialized = serializeJob(job);
  return {
    job: serialized && {
      ...serialized,
      // errorMessage is the raw internal message; show the user-facing one
      errorMessage: serialized.status === "failed" ? describeSyncError(serialized.errorCode, null) : null,
    },
    lastSyncedAt: lastCompleted?.finishedAt || null,
  };
}

// GET /api/sync — latest job status (polled by the sync screen)
export const GET = apiHandler(async ({ user }) => {
  const job = user.isDemo ? null : await retryIfRateLimitExpired(user.id);
  const latest = job || (await getLastCompletedSync(user.id));
  return present(latest, await getLastCompletedSync(user.id));
}, { limit: { limit: 120, windowSeconds: 60 }, name: "sync-status" });

// POST /api/sync — start a sync. Body { auto: true } only syncs when stale.
export const POST = apiHandler(
  async ({ user, request }) => {
    const body = await request.json().catch(() => ({}));
    const lastCompleted = await getLastCompletedSync(user.id);

    if (body?.auto) {
      const fresh = lastCompleted && Date.now() - lastCompleted.finishedAt.getTime() < AUTO_SYNC_AFTER_MS;
      if (fresh) return present(lastCompleted, lastCompleted);
    }

    const linked = await prisma.account.count({ where: { userId: user.id, provider: "github" } });
    if (!linked) {
      return jsonError(409, "NO_GITHUB", "Connect GitHub before syncing.");
    }

    const { job, created } = await enqueueSync(user.id, { trigger: lastCompleted ? "manual" : "initial" });
    if (created) startSyncInBackground(job.id);
    return Response.json(present(job, lastCompleted), { status: created ? 202 : 200 });
  },
  { mutation: true, demoAllowed: false, limit: { limit: 6, windowSeconds: 60 }, name: "sync" },
);

