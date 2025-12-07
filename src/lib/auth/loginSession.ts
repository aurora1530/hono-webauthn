import type { Context } from "hono";
import z from "zod";
import { createRedisSessionStore } from "../redis/redis-session.js";
import type { SessionStore } from "../session.js";
import { deleteCookieHelper, getCookieHelper, setCookieHelper } from "./cookieHelper.js";

const UserDataSchema = z.object({
  userID: z.string(),
  username: z.string(),
  usedPasskeyID: z.string(),
  debugMode: z.boolean().optional(),
});
type UserData = z.infer<typeof UserDataSchema>;
type LoginSessionStore = SessionStore<UserData>;

const LOGIN_SESSION_COOKIE_NAME = "ls";

const TTL_SEC = 60 * 60 * 24 * 7; // 1 week
const loginSessionStore = await createRedisSessionStore<UserData>({
  prefix: "login",
  ttlSec: TTL_SEC,
  parse: (data: unknown) => {
    const parsed = UserDataSchema.safeParse(data);
    return parsed.success ? parsed.data : undefined;
  },
});

interface LoginSessionController {
  getUserData(c: Context): Promise<UserData | undefined>;
  setLoggedIn(c: Context, userData: UserData): Promise<void>;
  setLoggedOut(c: Context): Promise<void>;
  changeDebugMode(c: Context, debugMode: boolean): Promise<void>;
}

const createLoginSessionController = (store: LoginSessionStore): LoginSessionController => {
  return {
    getUserData: async (c: Context) => {
      const sessionID = await getCookieHelper(c, LOGIN_SESSION_COOKIE_NAME);
      if (!sessionID) return undefined;
      return store.get(sessionID);
    },
    setLoggedIn: async (c: Context, userData: UserData) => {
      const currentSessionID = await getCookieHelper(c, LOGIN_SESSION_COOKIE_NAME);
      if (currentSessionID) await store.destroy(currentSessionID);
      const newSessionID = await store.createSessionWith(userData);
      await setCookieHelper(c, LOGIN_SESSION_COOKIE_NAME, newSessionID, { maxAge: TTL_SEC });
    },
    setLoggedOut: async (c: Context) => {
      const sessionID = await getCookieHelper(c, LOGIN_SESSION_COOKIE_NAME);
      if (sessionID) {
        await store.destroy(sessionID);
        deleteCookieHelper(c, LOGIN_SESSION_COOKIE_NAME);
      }
    },
    changeDebugMode: async (c: Context, debugMode: boolean) => {
      const sessionID = await getCookieHelper(c, LOGIN_SESSION_COOKIE_NAME);
      if (!sessionID) return;
      const userData = await store.get(sessionID);
      if (!userData) return;
      userData.debugMode = debugMode;
      await store.set(sessionID, userData);
    },
  };
};

export const loginSessionController = createLoginSessionController(loginSessionStore);
