import { createMiddleware } from 'hono/factory';
import { getRedis } from '../redis.js';
import { generateSessionID, type SessionService } from '../session.js';
import { getCookie, setCookie } from 'hono/cookie';
import { cookieOptions } from './cookie-options.js';


type UserData = { userID: string; username: string };
export type LoginSessionService = SessionService<UserData>;
export const LOGIN_SESSION_COOKIE_NAME = 'ls';


const TTL_SEC = 60 * 60 * 24 * 7; // 1 week
const createLoginSessionService = async (): Promise<LoginSessionService> => {
  const redis = await getRedis();
  const KEY = (sessionID: string) => `login:${sessionID}`;
  return {
    createSession: async () => {
      const sessionID = generateSessionID();
      await redis.set(KEY(sessionID), JSON.stringify({}), { EX: TTL_SEC });
      return sessionID;
    },
    refresh: async (sessionID: string) => {
      const result = await redis.expire(KEY(sessionID), TTL_SEC);
      return result === 1;
    },
    get: async (sessionID: string) => {
      const raw = await redis.get(KEY(sessionID));
      if (!raw) return undefined;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.userID === 'string' && typeof parsed.username === 'string') {
          return { userID: parsed.userID, username: parsed.username };
        }
      } catch {
        return undefined;
      }
      return undefined;
    },
    set: async (sessionID: string, data: UserData) => {
      await redis.set(KEY(sessionID), JSON.stringify(data), { EX: TTL_SEC });
    },
    destroy: async (sessionID: string) => {
      await redis.del(KEY(sessionID));
    }
  }
}

const loginSessionService = await createLoginSessionService();

export const loginSessionMiddleware = createMiddleware(async (c, next) => {
  c.set('loginSessionStore', loginSessionService);

  let sessionID = getCookie(c, LOGIN_SESSION_COOKIE_NAME);
  if (!sessionID || !await loginSessionService.refresh(sessionID)) {
    sessionID = await loginSessionService.createSession();
    setCookie(c, LOGIN_SESSION_COOKIE_NAME, sessionID, cookieOptions);
  }

  c.set('loginSessionID', sessionID);
  await next();
})
