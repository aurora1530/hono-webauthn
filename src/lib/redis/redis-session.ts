import { createInMemoryCache } from "../cache.js";
import type { JsonObject } from "../json.js";
import type { SessionID, SessionStore } from "../session.js";
import { getRedis } from "./redis.js";

type RedisSessionStoreOptions<T extends JsonObject = JsonObject> = {
  prefix: string;
  ttlSec: number;
  parse: (data: unknown) => T | undefined;
  useCache?: boolean;
};

const generateSessionID = (): SessionID => {
  return crypto.randomUUID();
};

const createRedisSessionStore = async <T extends JsonObject>(
  options: RedisSessionStoreOptions<T>,
): Promise<SessionStore<T>> => {
  const redis = await getRedis();
  // 無料枠のredisを使っているので、なるべくアクセス数を減らすためにin-memory cacheも利用する。
  // 10 seconds。短いので、「redisではexpireしているが、in-memory cacheではまだ有効」という状態はほぼ起きない。
  const inMemoryCache = options.useCache ? createInMemoryCache<T>({ ttlMs: 1000 * 10 }) : undefined;
  const KEY = (sessionID: string) => `${options.prefix}:${sessionID}`;

  return {
    createSessionWith: async (data: T) => {
      const sessionID = generateSessionID();
      await redis.set(KEY(sessionID), JSON.stringify(data), { EX: options.ttlSec });
      inMemoryCache?.set(sessionID, data);
      return sessionID;
    },
    refresh: async (sessionID: string) => {
      const result = await redis.expire(KEY(sessionID), options.ttlSec);
      if (result !== 1) {
        inMemoryCache?.delete(sessionID);
      }
      return result === 1;
    },
    get: async (sessionID: string) => {
      const cached = inMemoryCache?.get(sessionID);
      if (cached !== undefined) return cached;
      const raw = await redis.get(KEY(sessionID));
      if (!raw) return undefined;
      try {
        const parsed = JSON.parse(raw);
        const result = options.parse(parsed);
        if (result) inMemoryCache?.set(sessionID, result);
        return result;
      } catch {
        return undefined;
      }
    },
    getAndDestroy: async (sessionID: string) => {
      inMemoryCache?.delete(sessionID);
      const raw = await redis.getDel(KEY(sessionID));
      if (!raw) return undefined;
      try {
        const parsed = JSON.parse(raw);
        return options.parse(parsed);
      } catch {
        return undefined;
      }
    },
    set: async (sessionID: string, data: T) => {
      await redis.set(KEY(sessionID), JSON.stringify(data), { EX: options.ttlSec });
      inMemoryCache?.set(sessionID, data);
    },
    destroy: async (sessionID: string) => {
      await redis.del(KEY(sessionID));
      inMemoryCache?.delete(sessionID);
    },
  };
};

export { createRedisSessionStore };
