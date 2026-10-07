import { getRedis } from "./cache.js";

// Fixed-window rate limiter. Uses Redis when available so limits hold
// across processes; otherwise an in-memory window per process.

const memory = new Map();

function memoryHit(key, windowMs, now) {
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    memory.set(key, fresh);
    if (memory.size > 10_000) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    }
    return fresh;
  }
  entry.count += 1;
  return entry;
}

export async function rateLimit(key, { limit, windowSeconds }, now = Date.now()) {
  const windowMs = windowSeconds * 1000;
  const redis = await getRedis();
  if (redis) {
    try {
      const bucket = `dt:rl:${key}:${Math.floor(now / windowMs)}`;
      const count = await redis.incr(bucket);
      if (count === 1) await redis.expire(bucket, windowSeconds);
      const resetAt = (Math.floor(now / windowMs) + 1) * windowMs;
      return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfter: Math.ceil((resetAt - now) / 1000) };
    } catch {
      // fall back to memory
    }
  }
  const entry = memoryHit(key, windowMs, now);
  return { ok: entry.count <= limit, remaining: Math.max(0, limit - entry.count), retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
}

export function _resetMemoryLimiter() {
  memory.clear();
}
