import { createMiddleware } from 'hono/factory';
import { type SessionStore } from '../session.js';
import { getCookie, setCookie } from 'hono/cookie';
import { cookieOptions } from './cookie-options.js';
import { createRedisSessionStore } from '../redis-session.js';


type UserData = { userID: string; username: string };
export type LoginSessionStore = SessionStore<UserData>;
export const LOGIN_SESSION_COOKIE_NAME = 'ls';


const TTL_SEC = 60 * 60 * 24 * 7; // 1 week
const loginSessionStore = await createRedisSessionStore<UserData>({
  prefix: 'login',
  ttlSec: TTL_SEC,
  dataParser: (data: unknown) => {
    if (data && typeof data === 'object' && 'userID' in data && 'username' in data && typeof data.userID === 'string' && typeof data.username === 'string') {
      return {
        userID: data.userID,
        username: data.username
      }
    }
    return undefined;
  }
});

export const loginSessionMiddleware = createMiddleware(async (c, next) => {
  c.set('loginSessionStore', loginSessionStore);

  let sessionID = getCookie(c, LOGIN_SESSION_COOKIE_NAME);
  if (!sessionID || !await loginSessionStore.refresh(sessionID)) {
    sessionID = await loginSessionStore.createSession();
    setCookie(c, LOGIN_SESSION_COOKIE_NAME, sessionID, cookieOptions);
  }

  c.set('loginSessionID', sessionID);
  await next();
})
