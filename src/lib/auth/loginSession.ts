import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import z from "zod";
import prisma from "../../prisma.js";
import { createRedisSessionStore } from "../redis/redis-session.js";
import { serverMessageHandler } from "../serverMessage.js";
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

type LoginState =
  | {
      state: "LOGGED_IN";
      sessionID: string;
      userData: UserData;
    }
  | {
      state: "EXPIRED";
    }
  | {
      state: "LOGGED_OUT";
    };

interface LoginSessionController {
  getLoginState(c: Context): Promise<LoginState>;
  setLoggedIn(c: Context, userData: UserData): Promise<void>;
  setLoggedOut(c: Context): Promise<void>;
  changeDebugMode(c: Context, debugMode: boolean): Promise<void>;
}

const createLoginSessionController = (store: LoginSessionStore): LoginSessionController => {
  const getLoginState = async (c: Context): Promise<LoginState> => {
    const sessionID = await getCookieHelper(c, LOGIN_SESSION_COOKIE_NAME);
    if (!sessionID) return { state: "LOGGED_OUT" };
    const data = await store.get(sessionID);
    if (!data) return { state: "EXPIRED" };

    const passkey = await prisma.passkey.findUnique({
      where: { id: data.usedPasskeyID, userID: data.userID },
      select: { id: true },
    });
    if (!passkey) {
      await store.destroy(sessionID);
      return { state: "EXPIRED" };
    }
    return { state: "LOGGED_IN", sessionID, userData: data };
  };

  return {
    getLoginState,
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
      const loginState = await getLoginState(c);
      if (loginState.state !== "LOGGED_IN") return;
      await store.set(loginState.sessionID, { ...loginState.userData, debugMode });
    },
  };
};

export const loginSessionController = createLoginSessionController(loginSessionStore);

export const loginSessionExpirationMiddleware = createMiddleware(async (c, next) => {
  const loginState = await loginSessionController.getLoginState(c);
  if (loginState.state === "EXPIRED") {
    await loginSessionController.setLoggedOut(c);
    await serverMessageHandler.setMessage(
      c,
      "セッションの有効期限が切れました。再度ログインしてください。",
    );
  }

  await next();
});
