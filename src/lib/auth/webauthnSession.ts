import type { Context } from 'hono';
import { createRedisSessionStore } from '../redis/redis-session.js';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import z from 'zod';

const WebAuthnRegistrationGenerateSessionDataSchema = z.object({
  username: z.string()
});

type WebAuthnRegistrationGenerateSessionData = z.infer<typeof WebAuthnRegistrationGenerateSessionDataSchema>;

const webAuthnRegistrationGenerateSessionStore = await createRedisSessionStore<WebAuthnRegistrationGenerateSessionData>({
  prefix: 'webauthn-registration-init',
  ttlSec: 60 * 5, // 5 minutes
  dataParser: (data: unknown) => {
    const parsed = WebAuthnRegistrationGenerateSessionDataSchema.safeParse(data);
    return parsed.success ? parsed.data : undefined;
  }
});

const WebAuthnRegistrationVerifySessionDataSchema = z.object({
  challenge: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string()
  })
});

type WebAuthnRegistrationVerifySessionData = z.infer<typeof WebAuthnRegistrationVerifySessionDataSchema>;

const webAuthnRegistrationVerifySessionStore = await createRedisSessionStore<WebAuthnRegistrationVerifySessionData>({
  prefix: 'webauthn-registration',
  ttlSec: 60 * 5, // 5 minutes
  dataParser: (data: unknown) => {
    const parsed = WebAuthnRegistrationVerifySessionDataSchema.safeParse(data);
    return parsed.success ? parsed.data : undefined;
  }
});

const WebAuthnAuthenticationVerifySessionDataSchema = z.object({
  challenge: z.string()
});

type WebAuthnAuthenticationVerifySessionData = z.infer<typeof WebAuthnAuthenticationVerifySessionDataSchema>;

const webAuthnAuthenticationVerifySessionStore = await createRedisSessionStore<WebAuthnAuthenticationVerifySessionData>({
  prefix: 'webauthn-authentication',
  ttlSec: 60 * 5, // 5 minutes
  dataParser: (data: unknown) => {
    const parsed = WebAuthnAuthenticationVerifySessionDataSchema.safeParse(data);
    return parsed.success ? parsed.data : undefined;
  }
});

interface WebAuthnSessionStores {
  registration: {
    generate: typeof webAuthnRegistrationGenerateSessionStore;
    verify: typeof webAuthnRegistrationVerifySessionStore;
  };
  authentication: {
    verify: typeof webAuthnAuthenticationVerifySessionStore;
  }
}

const webauthnSessionStores: WebAuthnSessionStores = {
  registration: {
    generate: webAuthnRegistrationGenerateSessionStore,
    verify: webAuthnRegistrationVerifySessionStore
  },
  authentication: {
    verify: webAuthnAuthenticationVerifySessionStore
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
}

const WEBAUTHN_SESSION_COOKIE_NAMES = {
  registrationGenerate: 'webauthn-r-g',
  registrationVerify: 'webauthn-r-v',
  authenticationVerify: 'webauthn-a-v'
}
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'Lax' as const,
  maxAge: 60 * 5 // 5 minutes
};

const createWebAuthnSessionController = (stores: WebAuthnSessionStores): WebAuthnSessionController => {
  return {
    registration: {
      generate: {
        initialize: async (c: Context, data: WebAuthnRegistrationGenerateSessionData) => {
          const sessionID = await stores.registration.generate.createSessionWith(data);
          setCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.registrationGenerate, sessionID, COOKIE_OPTIONS);
          return sessionID;
        },
        extractSessionData: async (c: Context) => {
          const sessionID = getCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.registrationGenerate);
          if (!sessionID) return undefined;
          const data = await stores.registration.generate.getAndDestroy(sessionID);
          deleteCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.registrationGenerate, COOKIE_OPTIONS);
          return data;
        }
      },
      verify: {
        initialize: async (c: Context, data: WebAuthnRegistrationVerifySessionData) => {
          const sessionID = await stores.registration.verify.createSessionWith(data);
          setCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.registrationVerify, sessionID, COOKIE_OPTIONS);
          return sessionID;
        },
        extractSessionData: async (c: Context) => {
          const sessionID = getCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.registrationVerify);
          if (!sessionID) return undefined;
          const data = await stores.registration.verify.getAndDestroy(sessionID);
          deleteCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.registrationVerify, COOKIE_OPTIONS);
          return data;
        }
      }
    },
    authentication: {
      verify: {
        initialize: async (c: Context, data: WebAuthnAuthenticationVerifySessionData) => {
          const sessionID = await stores.authentication.verify.createSessionWith(data);
          setCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.authenticationVerify, sessionID, COOKIE_OPTIONS);
          return sessionID;
        },
        extractSessionData: async (c: Context) => {
          const sessionID = getCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.authenticationVerify);
          if (!sessionID) return undefined;
          const data = await stores.authentication.verify.getAndDestroy(sessionID);
          deleteCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.authenticationVerify, COOKIE_OPTIONS);
          return data;
        }
      }
    }
  }
}

export const webauthnSessionController = createWebAuthnSessionController(webauthnSessionStores);