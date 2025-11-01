import type { Context } from 'hono';
import { env } from 'hono/adapter';
import { getIronSession } from 'iron-session';
import { cookieOptions } from './cookie-options.js';

type WebAuthnInitialRegistrationSessionData = {
  username?: string;
};

type WebAuthnRegistrationSessionData = {
  challenge?: string;
  user?: {
    name: string;
    id: string;
  };
};

type WebAuthnAuthenticationSessionData = {
  challenge?: string;
};

class WebAuthnSession {
  private static _getInitialRegistrationSession(c: Context) {
    const password = env<{ WEBAUTHN_SESSION_SECRET: string }>(c).WEBAUTHN_SESSION_SECRET;
    return getIronSession<WebAuthnInitialRegistrationSessionData>(c.req.raw, c.res, {
      cookieName: 'webauthn-initial-registration-session',
      password: password,
      ttl: 60 * 5, // 5 minutes
      cookieOptions,
    });
  }

  public static async setInitialRegistrationSession(c: Context, username: string) {
    const session = await this._getInitialRegistrationSession(c);
    session.username = username;
    await session.save();
  }

  public static async getInitialRegistrationSession(
    c: Context
  ): Promise<WebAuthnInitialRegistrationSessionData> {
    const session = await this._getInitialRegistrationSession(c);
    const data = {
      ...session,
    };
    session.destroy();
    return data;
  }


  private static _getRegistrationSession(c: Context) {
    const password = env<{ WEBAUTHN_SESSION_SECRET: string }>(c).WEBAUTHN_SESSION_SECRET;
    return getIronSession<WebAuthnRegistrationSessionData>(c.req.raw, c.res, {
      cookieName: 'webauthn-registration-session',
      password: password,
      ttl: 60 * 5, // 5 minutes
      cookieOptions,
    });
  }

  public static async setRegistrationSession(
    c: Context,
    data: Required<WebAuthnRegistrationSessionData>
  ) {
    const session = await this._getRegistrationSession(c);
    session.challenge = data.challenge;
    session.user = data.user;
    await session.save();
  }

  public static async getRegistrationSession(
    c: Context
  ): Promise<WebAuthnRegistrationSessionData> {
    const session = await this._getRegistrationSession(c);
    const data = {
      ...session,
    };
    session.destroy();
    return data;
  }

  private static async _getAuthenticationSession(c: Context) {
    const password = env<{ WEBAUTHN_SESSION_SECRET: string }>(c).WEBAUTHN_SESSION_SECRET;
    const session = await getIronSession<WebAuthnAuthenticationSessionData>(
      c.req.raw,
      c.res,
      {
        cookieName: 'webauthn-session',
        password: password,
        ttl: 60 * 5, // 5 minutes
        cookieOptions,
      }
    );
    return session;
  }

  public static async setAuthenticationSession(
    c: Context,
    data: Required<WebAuthnAuthenticationSessionData>
  ) {
    const session = await this._getAuthenticationSession(c);
    session.challenge = data.challenge;
    await session.save();
  }

  public static async getAuthenticationSession(
    c: Context
  ): Promise<WebAuthnAuthenticationSessionData> {
    const session = await this._getAuthenticationSession(c);
    const data = {
      ...session,
    };
    session.destroy();
    return data;
  }
}

export default WebAuthnSession;
