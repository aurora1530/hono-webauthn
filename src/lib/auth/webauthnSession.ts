import type { Context } from 'hono';
import { createRedisSessionStore } from '../redis/redis-session.js';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

type WebAuthnRegistrationGenerateSessionData = {
  username: string;
};

const webAuthnRegistrationGenerateSessionStore = await createRedisSessionStore<WebAuthnRegistrationGenerateSessionData>({
  prefix: 'webauthn-registration-init',
  ttlSec: 60 * 5, // 5 minutes
  dataParser: (data: unknown) => {
    if (data && typeof data === 'object' && 'username' in data && typeof data.username === 'string') {
      return {
        username: data.username
      }
    }
    return undefined;
  }
});

type WebAuthnRegistrationVerifySessionData = {
  challenge: string;
  user: {
    id: string;
    name: string;
  };
};

const webAuthnRegistrationVerifySessionStore = await createRedisSessionStore<WebAuthnRegistrationVerifySessionData>({
  prefix: 'webauthn-registration',
  ttlSec: 60 * 5, // 5 minutes
  dataParser: (data: unknown) => {
    if (data && typeof data === 'object' && 'challenge' in data && 'user' in data &&
      typeof data.challenge === 'string' &&
      typeof data.user === 'object' &&
      data.user !== null &&
      'id' in data.user &&
      'name' in data.user &&
      typeof data.user.id === 'string' &&
      typeof data.user.name === 'string') {
      return {
        challenge: data.challenge,
        user: {
          id: data.user.id,
          name: data.user.name
        }
      }
    }
    return undefined;
  }
});

type WebAuthnAuthenticationVerifySessionData = {
  challenge: string;
};

const webAuthnAuthenticationVerifySessionStore = await createRedisSessionStore<WebAuthnAuthenticationVerifySessionData>({
  prefix: 'webauthn-authentication',
  ttlSec: 60 * 5, // 5 minutes
  dataParser: (data: unknown) => {
    if (data && typeof data === 'object' && 'challenge' in data && typeof data.challenge === 'string') {
      return {
        challenge: data.challenge
      }
    }
    return undefined;
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
          const sessionID = await stores.registration.generate.createSession();
          await stores.registration.generate.set(sessionID, data);
          setCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.registrationGenerate, sessionID, COOKIE_OPTIONS);
          return sessionID;
        },
        extractSessionData: async (c: Context) => {
          const sessionID = getCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.registrationGenerate);
          if (!sessionID) return undefined;
          const data = await stores.registration.generate.get(sessionID);
          await stores.registration.generate.destroy(sessionID);
          deleteCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.registrationGenerate, COOKIE_OPTIONS);
          return data;
        }
      },
      verify: {
        initialize: async (c: Context, data: WebAuthnRegistrationVerifySessionData) => {
          const sessionID = await stores.registration.verify.createSession();
          await stores.registration.verify.set(sessionID, data);
          setCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.registrationVerify, sessionID, COOKIE_OPTIONS);
          return sessionID;
        },
        extractSessionData: async (c: Context) => {
          const sessionID = getCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.registrationVerify);
          if (!sessionID) return undefined;
          const data = await stores.registration.verify.get(sessionID);
          await stores.registration.verify.destroy(sessionID);
          deleteCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.registrationVerify, COOKIE_OPTIONS);
          return data;
        }
      }
    },
    authentication: {
      verify: {
        initialize: async (c: Context, data: WebAuthnAuthenticationVerifySessionData) => {
          const sessionID = await stores.authentication.verify.createSession();
          await stores.authentication.verify.set(sessionID, data);
          setCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.authenticationVerify, sessionID, COOKIE_OPTIONS);
          return sessionID;
        },
        extractSessionData: async (c: Context) => {
          const sessionID = getCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.authenticationVerify);
          if (!sessionID) return undefined;
          const data = await stores.authentication.verify.get(sessionID);
          await stores.authentication.verify.destroy(sessionID);
          deleteCookie(c, WEBAUTHN_SESSION_COOKIE_NAMES.authenticationVerify, COOKIE_OPTIONS);
          return data;
        }
      }
    }
  }
}

export const webauthnSessionController = createWebAuthnSessionController(webauthnSessionStores);