import type { Context, MiddlewareHandler } from "hono";
import { getRedis } from "../redis/redis.js";

type RateLimitOptions = {
  windowSec: number;
  maxRequests: number;
  prefix?: string;
  identifier?: (c: Context) => Promise<string> | string;
};

export function createRateLimitMiddleware(options: RateLimitOptions): MiddlewareHandler {
  const windowSec = Math.max(1, options.windowSec);
  const maxRequests = Math.max(1, options.maxRequests);
  const prefix = options.prefix ?? "rate-limit";
  let warnedOnce = false;

  return async (c, next) => {
    const identifier = await resolveIdentifier(options.identifier, c);
    const key = `${prefix}:${identifier}`;

    try {
      const redis = await getRedis();
      const results = await redis.multi().incr(key).expire(key, windowSec, "NX").exec();
      const incrementResult = results?.[0];
      const currentCount =
        typeof incrementResult === "number" && Number.isFinite(incrementResult)
          ? incrementResult
          : 1;
      const ttlSec = await redis.ttl(key);
      const remaining = Math.max(0, maxRequests - currentCount);

      c.header("X-RateLimit-Limit", String(maxRequests));
      c.header("X-RateLimit-Remaining", String(remaining));
      if (ttlSec > 0) {
        const resetAt = Math.floor(Date.now() / 1000 + ttlSec);
        c.header("X-RateLimit-Reset", String(resetAt));
      }

      if (currentCount > maxRequests) {
        const retryAfter = ttlSec > 0 ? ttlSec : windowSec;
        c.header("Retry-After", String(retryAfter));
        return c.json(
          { error: "一定時間内のリクエスト上限に達しました。少し待ってから再度お試しください。" },
          429,
        );
      }

      return next();
    } catch (error) {
      if (!warnedOnce) {
        warnedOnce = true;
        console.warn("[rate-limit] Redis unavailable, allowing requests temporarily.", error);
      }
      return next();
    }
  };
}

async function resolveIdentifier(
  identifier: RateLimitOptions["identifier"],
  c: Context,
): Promise<string> {
  if (identifier) {
    const value = await identifier(c);
    if (value) return value;
  }

  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) {
    const [first] = forwardedFor.split(",");
    if (first?.trim()) return first.trim();
  }

  const realIp = c.req.header("x-real-ip");
  if (realIp) return realIp;

  const forwarded = c.req.header("forwarded");
  if (forwarded) {
    const match = forwarded.match(/for="?([^;,"]+)/i);
    if (match?.[1]) return match[1];
  }

  const userAgent = c.req.header("user-agent");
  if (userAgent) return `ua:${userAgent}`;

  return "unknown";
}
