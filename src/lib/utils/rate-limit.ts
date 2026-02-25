import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ─── Lazy singleton Redis client ────────────────────────

let _redis: Redis | null = null;
let _redisAvailable: boolean | null = null;

function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function getRedis(): Redis | null {
  if (_redisAvailable === false) return null;

  if (!_redis) {
    if (!isRedisConfigured()) {
      _redisAvailable = false;
      return null;
    }
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    _redisAvailable = true;
  }
  return _redis;
}

// ─── Rate limiter instances (cached per key prefix) ─────

const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const key = `${limit}:${windowMs}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    const windowS = `${Math.ceil(windowMs / 1000)} s` as `${number} s`;
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, windowS),
      prefix: "hive:rl",
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

// ─── Public API ─────────────────────────────────────────

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const limiter = getLimiter(limit, windowMs);

  // When Redis is not configured, allow all requests
  if (!limiter) {
    return { success: true, remaining: limit, resetAt: Date.now() + windowMs };
  }

  const result = await limiter.limit(key);

  return {
    success: result.success,
    remaining: result.remaining,
    resetAt: result.reset,
  };
}

export function rateLimitResponse(result: RateLimitResult) {
  return Response.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "X-RateLimit-Remaining": String(result.remaining),
        "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
      },
    }
  );
}
