import z from "zod";
import type { SessionStore } from "../session.js";
import { createRedisSessionStore } from "../redis/redis-session.js";
import type { Context } from "hono";
import { deleteCookieHelper, getCookieHelper, setCookieHelper } from "./cookieHelper.ts";

const ReauthDataSchema = z.object({
  userId: z.string(),
});

type ReauthData = z.infer<typeof ReauthDataSchema>;
type ReauthSessionStore = SessionStore<ReauthData>;

const REAUTH_SESSION_PREFIX = "reauth-session";
const REAUTH_SESSION_TTL_SEC = 60 * 10; // 10 minutes

const reauthSessionStore = await createRedisSessionStore<ReauthData>({
  prefix: REAUTH_SESSION_PREFIX,
  ttlSec: REAUTH_SESSION_TTL_SEC,
  dataParser: (data: unknown) => {
    const parsed = ReauthDataSchema.safeParse(data);
    return parsed.success ? parsed.data : undefined;
  },
});


type ReauthSessionController = {
  initialize(c: Context, data: ReauthData): Promise<void>;
  extractSessionData(c: Context): Promise<ReauthData | undefined>;
};


const createReauthSessionController = (
  store: ReauthSessionStore
): ReauthSessionController => {
  return {
    initialize: async (c: Context, data: ReauthData) => {
      const sessionID = await store.createSessionWith(data);
      await setCookieHelper(c, REAUTH_SESSION_PREFIX, sessionID, {
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      });
    },
    extractSessionData: async (c: Context) => {
      const sessionID = await getCookieHelper(c, REAUTH_SESSION_PREFIX);
      if (!sessionID) return undefined;
      deleteCookieHelper(c, REAUTH_SESSION_PREFIX, {
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      });
      return await store.getAndDestroy(sessionID);
    }
  };
};

export const reauthSessionController = createReauthSessionController(
  reauthSessionStore
);