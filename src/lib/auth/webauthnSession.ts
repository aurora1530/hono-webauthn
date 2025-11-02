import { createRedisSessionStore } from '../redis/redis-session.js';

type WebAuthnRegistrationInitSessionData = {
  username: string;
};

const webAuthnRegistrationInitSessionStore = await createRedisSessionStore<WebAuthnRegistrationInitSessionData>({
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

type WebAuthnRegistrationSessionData = {
  challenge: string;
  user: {
    id: string;
    name: string;
  };
};

const webAuthnRegistrationSessionStore = await createRedisSessionStore<WebAuthnRegistrationSessionData>({
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

type WebAuthnAuthenticationSessionData = {
  challenge: string;
};

const webAuthnAuthenticationSessionStore = await createRedisSessionStore<WebAuthnAuthenticationSessionData>({
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
  registrationInit: typeof webAuthnRegistrationInitSessionStore;
  registration: typeof webAuthnRegistrationSessionStore;
  authentication: typeof webAuthnAuthenticationSessionStore;
}

export const webauthnSessionStores: WebAuthnSessionStores = {
  registrationInit: webAuthnRegistrationInitSessionStore,
  registration: webAuthnRegistrationSessionStore,
  authentication: webAuthnAuthenticationSessionStore
};

