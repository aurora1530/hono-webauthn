import { createMiddleware } from 'hono/factory';
import { type SessionStore } from '../session.js';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { cookieOptions } from './cookie-options.js';
import { createRedisSessionStore } from '../redis/redis-session.js';
import type { Context } from 'hono';
import z from 'zod';


const UserDataSchema = z.object({
  userID: z.string(),
  username: z.string(),
  usedPasskeyID: z.string(),
})
type UserData = z.infer<typeof UserDataSchema>;
type LoginSessionStore = SessionStore<UserData>;

const LOGIN_SESSION_COOKIE_NAME = 'ls';

const TTL_SEC = 60 * 60 * 24 * 7; // 1 week
const loginSessionStore = await createRedisSessionStore<UserData>({
  prefix: 'login',
  ttlSec: TTL_SEC,
  dataParser: (data: unknown) => {
    const parsed = UserDataSchema.safeParse(data);
    return parsed.success ? parsed.data : undefined;
  }
});

interface LoginSessionController {
  getUserData(c: Context): Promise<UserData | undefined>;
  setLoggedIn(c: Context, userData: UserData): Promise<void>;
  setLoggedOut(c: Context): Promise<void>;
}

const createLoginSessionController = (store: LoginSessionStore): LoginSessionController => {
  return {
    getUserData: async (c: Context) => {
      const sessionID = getCookie(c, LOGIN_SESSION_COOKIE_NAME);
      if (!sessionID) return undefined;
      return store.get(sessionID);
    },
    setLoggedIn: async (c: Context, userData: UserData) => {
      const currentSessionID = getCookie(c, LOGIN_SESSION_COOKIE_NAME);
      if (currentSessionID) await store.destroy(currentSessionID);
      const newSessionID = await store.createSession();
      await store.set(newSessionID, userData);
      setCookie(c, LOGIN_SESSION_COOKIE_NAME, newSessionID, cookieOptions);
    },
    setLoggedOut: async (c: Context) => {
      const sessionID = getCookie(c, LOGIN_SESSION_COOKIE_NAME);
      if (sessionID) {
        await store.destroy(sessionID);
        deleteCookie(c, LOGIN_SESSION_COOKIE_NAME, cookieOptions);
      }
    }
  }
}

export const loginSessionController = createLoginSessionController(loginSessionStore);

export const loginSessionMiddleware = createMiddleware(async (c, next) => {
  // すでにセッションが存在する場合は有効期限を延長し、無ければ新規作成する
  let sessionID = getCookie(c, LOGIN_SESSION_COOKIE_NAME);
  if (!sessionID || !await loginSessionStore.refresh(sessionID)) {
    sessionID = await loginSessionStore.createSession();
    setCookie(c, LOGIN_SESSION_COOKIE_NAME, sessionID, cookieOptions);
  }

  await next();
})
