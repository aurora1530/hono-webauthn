import { Redis } from "@upstash/redis";
import type { RedisStore } from "./store.js";

export function createUpstashStore(url: string, token: string): RedisStore {
  const redis = new Redis({
    url,
    token,
    automaticDeserialization: false,
    enableAutoPipelining: false,
    signal: () => AbortSignal.timeout(10_000),
    retry: { retries: 0 },
  });
  return {
    isReady: true,
    get: (key) => redis.get<string>(key),
    getDel: (key) => redis.getdel<string>(key),
    set: (key, value, options) =>
      redis.set(key, value, options.XX ? { ex: options.EX, xx: true } : { ex: options.EX }),
    expire: (key, seconds) => redis.expire(key, seconds),
    del: (key) => redis.del(key),
    ttl: (key) => redis.ttl(key),
    multi: () => {
      const transaction = redis.multi();
      const chain = {
        incr(key: string) {
          transaction.incr(key);
          return chain;
        },
        expire(key: string, seconds: number, mode: "NX") {
          transaction.expire(key, seconds, mode);
          return chain;
        },
        exec: () => transaction.exec(),
      };
      return chain;
    },
  };
}
