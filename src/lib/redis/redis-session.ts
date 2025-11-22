import type { JsonObject } from "../json.js";
import type { SessionID, SessionStore } from "../session.js";
import { getRedis } from "./redis.js";

type RedisSessionStoreOptions<T extends JsonObject = JsonObject> = {
  prefix: string;
  ttlSec: number;
  dataParser: (data: unknown) => T | undefined;
};

const generateSessionID = (): SessionID => {
  return crypto.randomUUID();
};

const createRedisSessionStore = async <T extends JsonObject>(
  options: RedisSessionStoreOptions<T>,
): Promise<SessionStore<T>> => {
  const redis = await getRedis();
  const KEY = (sessionID: string) => `${options.prefix}:${sessionID}`;

  return {
    createSessionWith: async (data: T) => {
      const sessionID = generateSessionID();
      await redis.set(KEY(sessionID), JSON.stringify(data), { EX: options.ttlSec });
      return sessionID;
    },
    refresh: async (sessionID: string) => {
      const result = await redis.expire(KEY(sessionID), options.ttlSec);
      return result === 1;
    },
    get: async (sessionID: string) => {
      const raw = await redis.get(KEY(sessionID));
      if (!raw) return undefined;
      try {
        const parsed = JSON.parse(raw);
        return options.dataParser(parsed);
      } catch {
        return undefined;
      }
    },
    getAndDestroy: async (sessionID: string) => {
      const raw = await redis.getDel(KEY(sessionID));
      if (!raw) return undefined;
      try {
        const parsed = JSON.parse(raw);
        return options.dataParser(parsed);
      } catch {
        return undefined;
      }
    },
    set: async (sessionID: string, data: T) => {
      await redis.set(KEY(sessionID), JSON.stringify(data), { EX: options.ttlSec });
    },
    destroy: async (sessionID: string) => {
      await redis.del(KEY(sessionID));
    },
  };
};

export { createRedisSessionStore };
