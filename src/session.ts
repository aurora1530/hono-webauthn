import type { Context } from 'hono';
import { env } from 'hono/adapter';
import { createMiddleware } from 'hono/factory';
import { getIronSession, type IronSession } from 'iron-session';

type LoginSessionData =
  | {
      isLogin: false;
    }
  | {
      isLogin: true;
      username: string;
      userID: string;
    };

export type Session = IronSession<LoginSessionData>;

export const loginSessionMiddleware = createMiddleware(async (c, next) => {
  const secret = env<{ SESSION_SECRET: string }>(c).SESSION_SECRET;
  const session = await getIronSession<LoginSessionData>(c.req.raw, c.res, {
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
