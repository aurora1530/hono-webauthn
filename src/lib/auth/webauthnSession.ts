import type { Context } from "hono";
import z from "zod";
import type { JsonObject } from "../json.js";
import { createRedisSessionStore } from "../redis/redis-session.js";
import { deleteCookieHelper, getCookieHelper, setCookieHelper } from "./cookieHelper.js";

const WebAuthnRegistrationGenerateSessionDataSchema = z.object({ username: z.string() });
type WebAuthnRegistrationGenerateSessionData = z.infer<
  typeof WebAuthnRegistrationGenerateSessionDataSchema
>;

const WebAuthnRegistrationVerifySessionDataSchema = z.object({
  challenge: z.string(),
  user: z.object({ id: z.string(), name: z.string() }),
});
type WebAuthnRegistrationVerifySessionData = z.infer<
  typeof WebAuthnRegistrationVerifySessionDataSchema
>;

const WebAuthnAuthenticationVerifySessionDataSchema = z.object({ challenge: z.string() });
type WebAuthnAuthenticationVerifySessionData = z.infer<
  typeof WebAuthnAuthenticationVerifySessionDataSchema
>;

const WebAuthnReauthenticationVerifySessionDataSchema = z.object({ challenge: z.string() });
type WebAuthnReauthenticationVerifySessionData = z.infer<
  typeof WebAuthnReauthenticationVerifySessionDataSchema
>;

const WebAuthnTestAuthenticationVerifySessionDataSchema = z.object({
  challenge: z.string(),
  passkeyId: z.string(),
});
type WebAuthnTestAuthenticationVerifySessionData = z.infer<
  typeof WebAuthnTestAuthenticationVerifySessionDataSchema
>;

const WebAuthnPrfAuthenticationVerifySessionDataSchema = z.object({
  challenge: z.string(),
  passkeyId: z.string(),
});
type WebAuthnPrfAuthenticationVerifySessionData = z.infer<
  typeof WebAuthnPrfAuthenticationVerifySessionDataSchema
>;

const SESSION_TTL_SEC = 60 * 5; // 5 minutes

const makeStore = async <T extends JsonObject>(prefix: string, schema: z.ZodType<T>) =>
  createRedisSessionStore<T>({
    prefix,
    ttlSec: SESSION_TTL_SEC,
    dataParser: (data: unknown) => {
      const parsed = schema.safeParse(data);
      return parsed.success ? parsed.data : undefined;
    },
  });

const webAuthnRegistrationGenerateSessionStore = await makeStore(
  "webauthn-registration-init",
  WebAuthnRegistrationGenerateSessionDataSchema,
);
const webAuthnRegistrationVerifySessionStore = await makeStore(
  "webauthn-registration",
  WebAuthnRegistrationVerifySessionDataSchema,
);
const webAuthnAuthenticationVerifySessionStore = await makeStore(
  "webauthn-authentication",
  WebAuthnAuthenticationVerifySessionDataSchema,
);
const webAuthnReauthenticationVerifySessionStore = await makeStore(
  "webauthn-reauthentication",
  WebAuthnReauthenticationVerifySessionDataSchema,
);
const webAuthnTestAuthenticationVerifySessionStore = await makeStore(
  "webauthn-test-authentication",
  WebAuthnTestAuthenticationVerifySessionDataSchema,
);
const webAuthnPrfAuthenticationVerifySessionStore = await makeStore(
  "webauthn-prf-authentication",
  WebAuthnPrfAuthenticationVerifySessionDataSchema,
);

interface WebAuthnSessionStores {
  registration: {
    generate: typeof webAuthnRegistrationGenerateSessionStore;
    verify: typeof webAuthnRegistrationVerifySessionStore;
  };
  authentication: {
    verify: typeof webAuthnAuthenticationVerifySessionStore;
  };
  reauthentication: {
    verify: typeof webAuthnReauthenticationVerifySessionStore;
  };
  testAuthentication: {
    verify: typeof webAuthnTestAuthenticationVerifySessionStore;
  };
  prfAuthentication: {
    verify: typeof webAuthnPrfAuthenticationVerifySessionStore;
  };
}

const webauthnSessionStores: WebAuthnSessionStores = {
  registration: {
    generate: webAuthnRegistrationGenerateSessionStore,
    verify: webAuthnRegistrationVerifySessionStore,
  },
  authentication: {
    verify: webAuthnAuthenticationVerifySessionStore,
  },
  reauthentication: {
    verify: webAuthnReauthenticationVerifySessionStore,
  },
  testAuthentication: {
    verify: webAuthnTestAuthenticationVerifySessionStore,
  },
  prfAuthentication: {
    verify: webAuthnPrfAuthenticationVerifySessionStore,
  },
};

interface SessionDataHandler<T extends object> {
  initialize(c: Context, data: T): Promise<string>;
  extractSessionData(c: Context): Promise<T | undefined>;
}

interface WebAuthnSessionController {
  registration: {
    generate: SessionDataHandler<WebAuthnRegistrationGenerateSessionData>;
    verify: SessionDataHandler<WebAuthnRegistrationVerifySessionData>;
  };
  authentication: {
    verify: SessionDataHandler<WebAuthnAuthenticationVerifySessionData>;
  };
  reauthentication: {
    verify: SessionDataHandler<WebAuthnReauthenticationVerifySessionData>;
  };
  testAuthentication: {
    verify: SessionDataHandler<WebAuthnTestAuthenticationVerifySessionData>;
  };
  prfAuthentication: {
    verify: SessionDataHandler<WebAuthnPrfAuthenticationVerifySessionData>;
  };
}

const WEBAUTHN_SESSION_COOKIE_NAMES = {
  registrationGenerate: "webauthn-r-g",
  registrationVerify: "webauthn-r-v",
  authenticationVerify: "webauthn-a-v",
  reauthenticationVerify: "webauthn-ra-v",
  testAuthenticationVerify: "webauthn-ta-v",
  prfAuthenticationVerify: "webauthn-prf-v",
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
  stores: WebAuthnSessionStores,
): WebAuthnSessionController => ({
  registration: {
    generate: createHandler<WebAuthnRegistrationGenerateSessionData>(
      stores.registration.generate,
      WEBAUTHN_SESSION_COOKIE_NAMES.registrationGenerate,
    ),
    verify: createHandler<WebAuthnRegistrationVerifySessionData>(
      stores.registration.verify,
      WEBAUTHN_SESSION_COOKIE_NAMES.registrationVerify,
    ),
  },
  authentication: {
    verify: createHandler<WebAuthnAuthenticationVerifySessionData>(
      stores.authentication.verify,
      WEBAUTHN_SESSION_COOKIE_NAMES.authenticationVerify,
    ),
  },
  reauthentication: {
    verify: createHandler<WebAuthnReauthenticationVerifySessionData>(
      stores.reauthentication.verify,
      WEBAUTHN_SESSION_COOKIE_NAMES.reauthenticationVerify,
    ),
  },
  testAuthentication: {
    verify: createHandler<WebAuthnTestAuthenticationVerifySessionData>(
      stores.testAuthentication.verify,
      WEBAUTHN_SESSION_COOKIE_NAMES.testAuthenticationVerify,
    ),
  },
  prfAuthentication: {
    verify: createHandler<WebAuthnPrfAuthenticationVerifySessionData>(
      stores.prfAuthentication.verify,
      WEBAUTHN_SESSION_COOKIE_NAMES.prfAuthenticationVerify,
    ),
  },
});

export const webauthnSessionController = createWebAuthnSessionController(webauthnSessionStores);
