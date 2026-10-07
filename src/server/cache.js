import { createClient } from "redis";

// Redis is optional. Without REDIS_URL every call falls through to the
// database, which is correct, just slower.

const globalForRedis = globalThis;

async function getClient() {
  if (!process.env.REDIS_URL) return null;
  if (globalForRedis.__devtraceRedis) return globalForRedis.__devtraceRedis;

  const client = createClient({
    url: process.env.REDIS_URL,
    socket: { connectTimeout: 2000, reconnectStrategy: (retries) => Math.min(retries * 500, 5000) },
  });
  client.on("error", () => {
    // Connection errors are surfaced per call; avoid crashing the process.
  });
  globalForRedis.__devtraceRedis = client;
  try {
    await client.connect();
  } catch {
    globalForRedis.__devtraceRedis = null;
    return null;
  }
  return client;
}

export async function getRedis() {
  const client = await getClient();
  return client?.isReady ? client : null;
}

// Each user has a cache "generation". Bumping it after a sync invalidates
// every cached aggregate for that user without scanning keys.
async function userGeneration(client, userId) {
  return (await client.get(`dt:gen:${userId}`)) || "0";
}

/**
 * Cache a per-user computation. Keys are namespaced by user id so cached
 * results can never be served to another user.
 */
export async function cachedForUser(userId, key, compute, ttlSeconds = 300) {
  const client = await getRedis();
  if (!client) return compute();

  let cacheKey;
  try {
    const gen = await userGeneration(client, userId);
    cacheKey = `dt:${userId}:${gen}:${key}`;
    const hit = await client.get(cacheKey);
    if (hit) return JSON.parse(hit);
  } catch {
    return compute();
  }

  const value = await compute();
  try {
    await client.set(cacheKey, JSON.stringify(value), { EX: ttlSeconds });
  } catch {
    // Caching is best effort
  }
  return value;
}

export async function invalidateUserCache(userId) {
  const client = await getRedis();
  if (!client) return;
  try {
    await client.incr(`dt:gen:${userId}`);
  } catch {
    // ignore
  }
}
