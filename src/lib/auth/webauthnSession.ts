import type { Context } from 'hono';
import { createRedisSessionStore } from '../redis/redis-session.js';
import z from 'zod';
import { deleteCookieHelper, getCookieHelper, setCookieHelper } from './cookieHelper.ts';

const WebAuthnRegistrationGenerateSessionDataSchema = z.object({ username: z.string() });
type WebAuthnRegistrationGenerateSessionData = z.infer<
  typeof WebAuthnRegistrationGenerateSessionDataSchema
>;

const WebAuthnRegistrationVerifySessionDataSchema = z.object({
  challenge: z.string(),
  user: z.object({ id: z.string(), name: z.string() })
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

const SESSION_TTL_SEC = 60 * 5; // 5 minutes

const makeStore = async <T extends Record<string, unknown>>(
  prefix: string,
  schema: z.ZodType<T>
) =>
  createRedisSessionStore<T>({
    prefix,
    ttlSec: SESSION_TTL_SEC,
    dataParser: (data: unknown) => {
      const parsed = schema.safeParse(data);
      return parsed.success ? parsed.data : undefined;
    }
  });

const webAuthnRegistrationGenerateSessionStore = await makeStore(
  'webauthn-registration-init',
  WebAuthnRegistrationGenerateSessionDataSchema
);
const webAuthnRegistrationVerifySessionStore = await makeStore(
  'webauthn-registration',
  WebAuthnRegistrationVerifySessionDataSchema
);
const webAuthnAuthenticationVerifySessionStore = await makeStore(
  'webauthn-authentication',
  WebAuthnAuthenticationVerifySessionDataSchema
);
const webAuthnReauthenticationVerifySessionStore = await makeStore(
  'webauthn-reauthentication',
  WebAuthnReauthenticationVerifySessionDataSchema
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
}

const webauthnSessionStores: WebAuthnSessionStores = {
  registration: {
    generate: webAuthnRegistrationGenerateSessionStore,
    verify: webAuthnRegistrationVerifySessionStore
  },
  authentication: {
    verify: webAuthnAuthenticationVerifySessionStore
  },
  reauthentication: {
    verify: webAuthnReauthenticationVerifySessionStore
  }
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
}

const WEBAUTHN_SESSION_COOKIE_NAMES = {
  registrationGenerate: 'webauthn-r-g',
  registrationVerify: 'webauthn-r-v',
  authenticationVerify: 'webauthn-a-v',
  reauthenticationVerify: 'webauthn-ra-v'
}
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'Lax' as const,
  maxAge: SESSION_TTL_SEC
};

const createHandler = <T extends object>(
  store: { createSessionWith: (data: T) => Promise<string>; getAndDestroy: (id: string) => Promise<T | undefined> },
  cookieName: string
): SessionDataHandler<T> => ({
  initialize: async (c: Context, data: T) => {
    const sessionID = await store.createSessionWith(data);
    await setCookieHelper(c, cookieName, sessionID, COOKIE_OPTIONS);
    return sessionID;
  },
  extractSessionData: async (c: Context) => {
    const sessionID = await getCookieHelper(c, cookieName);
    if (!sessionID) return undefined;
    const data = await store.getAndDestroy(sessionID);
    deleteCookieHelper(c, cookieName, COOKIE_OPTIONS);
    return data;
  }
});

const createWebAuthnSessionController = (
  stores: WebAuthnSessionStores
): WebAuthnSessionController => ({
  registration: {
    generate: createHandler<WebAuthnRegistrationGenerateSessionData>(
      stores.registration.generate,
      WEBAUTHN_SESSION_COOKIE_NAMES.registrationGenerate
    ),
    verify: createHandler<WebAuthnRegistrationVerifySessionData>(
      stores.registration.verify,
      WEBAUTHN_SESSION_COOKIE_NAMES.registrationVerify
    )
  },
  authentication: {
    verify: createHandler<WebAuthnAuthenticationVerifySessionData>(
      stores.authentication.verify,
      WEBAUTHN_SESSION_COOKIE_NAMES.authenticationVerify
    )
  },
  reauthentication: {
    verify: createHandler<WebAuthnReauthenticationVerifySessionData>(
      stores.reauthentication.verify,
      WEBAUTHN_SESSION_COOKIE_NAMES.reauthenticationVerify
    )
  }
});

export const webauthnSessionController = createWebAuthnSessionController(webauthnSessionStores);
