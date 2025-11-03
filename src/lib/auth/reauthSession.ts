import type { Context } from 'hono';
import { createRedisSessionStore } from '../redis/redis-session.js';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { cookieOptions } from './cookie-options.js';
import z from 'zod';

const ReauthSessionDataSchema = z.object({
  userID: z.string(),
});

type ReauthSessionData = z.infer<typeof ReauthSessionDataSchema>;

const TTL_SEC = 60 * 5; // 5 minutes

const reauthSessionStore = await createRedisSessionStore<ReauthSessionData>({
  prefix: 'reauth',
  ttlSec: TTL_SEC,
  dataParser: (data: unknown) => {
    const parsed = ReauthSessionDataSchema.safeParse(data);
    return parsed.success ? parsed.data : undefined;
  },
});

const REAUTH_COOKIE_NAME = 'ra';

const reauthCookieOptions = {
  ...cookieOptions,
  maxAge: TTL_SEC,
} as const;

interface ReauthSessionController {
  markReauthenticated(c: Context, userID: string): Promise<void>;
  consumeReauthentication(c: Context, userID: string): Promise<boolean>;
}

const createReauthSessionController = (): ReauthSessionController => {
  return {
    markReauthenticated: async (c: Context, userID: string) => {
      const currentSessionID = getCookie(c, REAUTH_COOKIE_NAME);
      if (currentSessionID) {
        await reauthSessionStore.destroy(currentSessionID);
      }

      const sessionID = await reauthSessionStore.createSessionWith({ userID });
      setCookie(c, REAUTH_COOKIE_NAME, sessionID, reauthCookieOptions);
    },
    consumeReauthentication: async (c: Context, userID: string) => {
      const sessionID = getCookie(c, REAUTH_COOKIE_NAME);
      if (!sessionID) {
        return false;
      }

      const sessionData = await reauthSessionStore.get(sessionID);
      await reauthSessionStore.destroy(sessionID);
      deleteCookie(c, REAUTH_COOKIE_NAME, reauthCookieOptions);

      if (!sessionData) {
        return false;
      }

      return sessionData.userID === userID;
    },
  };
};

export const reauthSessionController = createReauthSessionController();
