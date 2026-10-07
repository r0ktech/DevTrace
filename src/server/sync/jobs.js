import prisma from "../db.js";
import { initialStages } from "../../lib/sync-stages.js";

// A running job that hasn't written a heartbeat for this long is treated as
// dead (for example the server restarted mid-sync).
export const STALE_AFTER_MS = 10 * 60_000;

const ACTIVE = ["queued", "running"];

export async function getLatestSyncJob(userId) {
  return prisma.syncJob.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function getLastCompletedSync(userId, { excludeId } = {}) {
  return prisma.syncJob.findFirst({
    where: { userId, status: "completed", ...(excludeId ? { id: { not: excludeId } } : {}) },
    orderBy: { finishedAt: "desc" },
  });
}

async function failStalledJobs(userId, now) {
  await prisma.syncJob.updateMany({
    where: {
      userId,
      status: { in: ACTIVE },
      OR: [
        { heartbeatAt: { lt: new Date(now.getTime() - STALE_AFTER_MS) } },
        { heartbeatAt: null, createdAt: { lt: new Date(now.getTime() - STALE_AFTER_MS) } },
      ],
    },
    data: { status: "failed", errorCode: "STALLED", finishedAt: now },
  });
}

/**
 * Create a sync job unless one is already queued or running for the user.
 * Returns { job, created }.
 */
export async function enqueueSync(userId, { trigger = "manual", now = new Date() } = {}) {
  await failStalledJobs(userId, now);

  const active = await prisma.syncJob.findFirst({
    where: { userId, status: { in: ACTIVE } },
    orderBy: { createdAt: "desc" },
  });
  if (active) return { job: active, created: false };

  const job = await prisma.syncJob.create({
    data: { userId, trigger, status: "queued", stages: initialStages() },
  });
  return { job, created: true };
}

/** Atomically move a queued job to running. Returns false if already claimed. */
export async function claimJob(jobId, now = new Date()) {
  const { count } = await prisma.syncJob.updateMany({
    where: { id: jobId, status: "queued" },
    data: { status: "running", startedAt: now, heartbeatAt: now },
  });
  return count === 1;
}

/**
 * Shape a job for API responses. Never includes anything sensitive.
 */
export function serializeJob(job) {
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    trigger: job.trigger,
    stages: job.stages,
    currentStage: job.currentStage,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    retryAfter: job.retryAfter,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    createdAt: job.createdAt,
  };
}
