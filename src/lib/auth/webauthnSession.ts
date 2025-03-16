import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';
import type { Context } from 'hono';
import { env } from 'hono/adapter';
import { getIronSession } from 'iron-session';

type WebAuthnInitialRegistrationSessionData = {
  username: string;
};

type WebAuthnRegistrationSessionData = {
  username: string;
  challenge: string;
  webauthnUserID: string;
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
    });
  }

  public static async setRegistrationSession(
    c: Context,
    username: string,
    data: PublicKeyCredentialCreationOptionsJSON
  ) {
    const session = await this._getRegistrationSession(c);
    session.username = username;
    session.challenge = data.challenge;
    session.webauthnUserID = data.user.id;
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
      }
    );
    return session;
  }

  public static async setAuthenticationSession(
    c: Context,
    data: PublicKeyCredentialRequestOptionsJSON
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
