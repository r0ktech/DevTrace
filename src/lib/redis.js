import { createClient } from 'redis';

const globalForRedis = globalThis;

function getRedisClient() {
  if (globalForRedis.redis) {
    return globalForRedis.redis;
  }

  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  client.on('error', (err) => {
    console.error('Redis client error:', err);
  });

  client.connect().catch((err) => {
    console.error('Redis connection failed:', err);
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = client;
  }

  return client;
}

const redis = getRedisClient();

export default redis;

/**
 * Get a cached value or compute and cache it.
 * @param {string} key
 * @param {Function} fn - async function that returns the value to cache
 * @param {number} ttl - time to live in seconds (default 300 = 5 min)
 */
export async function cached(key, fn, ttl = 300) {
  try {
    const hit = await redis.get(key);
    if (hit) {
      return JSON.parse(hit);
    }
  } catch {
    // Redis unavailable, fall through to compute
  }

  const value = await fn();

  try {
    await redis.set(key, JSON.stringify(value), { EX: ttl });
  } catch {
    // Redis unavailable, skip caching
  }

  return value;
}

/**
 * Invalidate cache keys matching a pattern.
 * @param {string} pattern - e.g. "dashboard:user123:*"
 */
export async function invalidateCache(pattern) {
  try {
    const keys = [];
    for await (const key of redis.scanIterator({ MATCH: pattern })) {
      keys.push(key);
    }
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch {
    // Redis unavailable
  }
}
