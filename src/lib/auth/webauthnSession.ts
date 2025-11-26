import type { Context } from "hono";
import z from "zod";
import type { JsonObject } from "../json.js";
import { createRedisSessionStore } from "../redis/redis-session.js";
import type { SessionStore } from "../session.js";
import { deleteCookieHelper, getCookieHelper, setCookieHelper } from "./cookieHelper.js";

interface WebAuthnOperationTypes<T> {
  registration: {
    generate: T;
    verify: T;
  };
  authentication: {
    verify: T;
  };
  reauthentication: {
    verify: T;
  };
  testAuthentication: {
    verify: T;
  };
  prfAuthentication: {
    verify: T;
  };
}

const webAuthnSessionSchemas = {
  registration: {
    generate: z.object({ username: z.string() }),
    verify: z.object({
      challenge: z.string(),
      user: z.object({ id: z.string(), name: z.string() }),
    }),
  },
  authentication: {
    verify: z.object({ challenge: z.string() }),
  },
  reauthentication: {
    verify: z.object({ challenge: z.string() }),
  },
  testAuthentication: {
    verify: z.object({ challenge: z.string(), passkeyId: z.string() }),
  },
  prfAuthentication: {
    verify: z.object({ challenge: z.string(), passkeyId: z.string() }),
  },
} satisfies WebAuthnOperationTypes<z.ZodType<JsonObject>>;

const SESSION_TTL_SEC = 60 * 5; // 5 minutes

const makeStore = async <T extends JsonObject>(prefix: string, schema: z.ZodType<T>) =>
  createRedisSessionStore<T>({
    prefix,
    ttlSec: SESSION_TTL_SEC,
    parse: (data: unknown) => {
      const parsed = schema.safeParse(data);
      return parsed.success ? parsed.data : undefined;
    },
  });

const webAuthnSessionStores = {
  registration: {
    generate: await makeStore(
      "webauthn-registration-init",
      webAuthnSessionSchemas.registration.generate,
    ),
    verify: await makeStore("webauthn-registration", webAuthnSessionSchemas.registration.verify),
  },
  authentication: {
    verify: await makeStore(
      "webauthn-authentication",
      webAuthnSessionSchemas.authentication.verify,
    ),
  },
  reauthentication: {
    verify: await makeStore(
      "webauthn-reauthentication",
      webAuthnSessionSchemas.reauthentication.verify,
    ),
  },
  testAuthentication: {
    verify: await makeStore(
      "webauthn-test-authentication",
      webAuthnSessionSchemas.testAuthentication.verify,
    ),
  },
  prfAuthentication: {
    verify: await makeStore(
      "webauthn-prf-authentication",
      webAuthnSessionSchemas.prfAuthentication.verify,
    ),
  },
} satisfies WebAuthnOperationTypes<SessionStore<JsonObject>>;

interface SessionDataHandler<T> {
  initialize(c: Context, data: T): Promise<string>;
  extractSessionData(c: Context): Promise<T | undefined>;
}

type SessionDataHandlerMap<Schemas extends WebAuthnOperationTypes<z.ZodType<JsonObject>>> = {
  [Operation in keyof Schemas]: {
    [Step in keyof Schemas[Operation]]: SessionDataHandler<z.infer<Schemas[Operation][Step]>>;
  };
};

type WebAuthnSessionController = SessionDataHandlerMap<typeof webAuthnSessionSchemas>;

const COOKIE_NAMES: WebAuthnOperationTypes<string> = {
  registration: {
    generate: "webauthn-r-g",
    verify: "webauthn-r-v",
  },
  authentication: {
    verify: "webauthn-a-v",
  },
  reauthentication: {
    verify: "webauthn-ra-v",
  },
  testAuthentication: {
    verify: "webauthn-ta-v",
  },
  prfAuthentication: {
    verify: "webauthn-prf-v",
  },
};

const createHandler = <T extends object>(
  store: {
    createSessionWith: (data: T) => Promise<string>;
    getAndDestroy: (id: string) => Promise<T | undefined>;
  },
  cookieName: string,
): SessionDataHandler<T> => ({
  initialize: async (c: Context, data: T) => {
    const sessionID = await store.createSessionWith(data);
    await setCookieHelper(c, cookieName, sessionID, { maxAge: SESSION_TTL_SEC });
    return sessionID;
  },
  extractSessionData: async (c: Context) => {
    const sessionID = await getCookieHelper(c, cookieName);
    if (!sessionID) return undefined;
    const data = await store.getAndDestroy(sessionID);
    deleteCookieHelper(c, cookieName);
    return data;
  },
});

const createWebAuthnSessionController = (
  stores: typeof webAuthnSessionStores,
): WebAuthnSessionController => ({
  registration: {
    generate: createHandler(stores.registration.generate, COOKIE_NAMES.registration.generate),
    verify: createHandler(stores.registration.verify, COOKIE_NAMES.registration.verify),
  },
  authentication: {
    verify: createHandler(stores.authentication.verify, COOKIE_NAMES.authentication.verify),
  },
  reauthentication: {
    verify: createHandler(stores.reauthentication.verify, COOKIE_NAMES.reauthentication.verify),
  },
  testAuthentication: {
    verify: createHandler(stores.testAuthentication.verify, COOKIE_NAMES.testAuthentication.verify),
  },
  prfAuthentication: {
    verify: createHandler(stores.prfAuthentication.verify, COOKIE_NAMES.prfAuthentication.verify),
  },
});

export const webauthnSessionController = createWebAuthnSessionController(webAuthnSessionStores);
