import type { Context } from 'hono';
import { env } from 'hono/adapter';
import { createMiddleware } from 'hono/factory';
import { getIronSession, type IronSession } from 'iron-session';

type SessionData =
  | {
      isLogin: false;
    }
  | {
      isLogin: true;
      username: string;
      userID: string;
    };

export type Session = IronSession<SessionData>;

export const sessionMiddleware = createMiddleware(async (c, next) => {
  const secret = env<{ SESSION_SECRET: string }>(c).SESSION_SECRET;
  const session = await getIronSession<SessionData>(c.req.raw, c.res, {
    cookieName: 'session',
    password: secret,
  });

  // Initialize session data
  if (!session.isLogin) {
    session.isLogin = false;
  }

  c.set('session', session);
  await next();
});
