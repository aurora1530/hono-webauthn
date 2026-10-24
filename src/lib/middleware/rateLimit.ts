import type { Context, MiddlewareHandler } from "hono";
import { createClientIpResolver } from "../clientIp.js";
import { getRedis } from "../redis/redis.js";

type RateLimitOptions = {
  windowSec: number;
  maxRequests: number;
  prefix?: string;
  trustedProxies?: string[];
  userIdentifier?: (c: Context) => Promise<string | undefined> | string | undefined;
};

export function createRateLimitMiddleware(options: RateLimitOptions): MiddlewareHandler {
  const windowSec = Math.max(1, options.windowSec);
  const maxRequests = Math.max(1, options.maxRequests);
  const prefix = options.prefix ?? "rate-limit";
  const resolveClientIp = createClientIpResolver(options.trustedProxies);
  let warnedOnce = false;

  const consumeLimit = async (redis: Awaited<ReturnType<typeof getRedis>>, key: string) => {
    const results = await redis.multi().incr(key).expire(key, windowSec, "NX").exec();
    const currentCount = results?.[0];
    const ttlSec = await redis.ttl(key);
    if (
      typeof currentCount !== "number" ||
      !Number.isSafeInteger(currentCount) ||
      currentCount < 1 ||
      !Number.isInteger(ttlSec) ||
      ttlSec < 0
    ) {
      throw new Error("Invalid rate limit counter");
    }
    return { currentCount, ttlSec: Math.max(1, ttlSec) };
  };

  return async (c, next) => {
    try {
      const redis = await getRedis();
      if (!redis.isReady) throw new Error("Rate limit store is not ready");
      let limit = await consumeLimit(redis, `${prefix}:ip:${resolveClientIp(c)}`);
      if (limit.currentCount <= maxRequests && options.userIdentifier) {
        const userID = await options.userIdentifier(c);
        if (userID) {
          const userLimit = await consumeLimit(redis, `${prefix}:user:${userID}`);
          if (userLimit.currentCount > limit.currentCount) limit = userLimit;
        }
      }

      const { currentCount, ttlSec } = limit;
      c.header("X-RateLimit-Limit", String(maxRequests));
      c.header("X-RateLimit-Remaining", String(Math.max(0, maxRequests - currentCount)));
      c.header("X-RateLimit-Reset", String(Math.floor(Date.now() / 1000) + ttlSec));

      if (currentCount > maxRequests) {
        c.header("Retry-After", String(ttlSec));
        return c.json(
          { error: "一定時間内のリクエスト上限に達しました。少し待ってから再度お試しください。" },
          429,
        );
      }
    } catch {
      if (!warnedOnce) {
        warnedOnce = true;
        console.warn("[rate-limit] Rate limit check failed; requests denied.");
      }
      c.header("Retry-After", "1");
      return c.json({ error: "一時的にリクエストを処理できません。再度お試しください。" }, 503);
    }
    await next();
  };
}
