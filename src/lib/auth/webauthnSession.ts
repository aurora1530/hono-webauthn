import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';
import type { Context } from 'hono';
import { env } from 'hono/adapter';
import { getIronSession } from 'iron-session';

type WebAuthnAuthenticationSessionData = {
  challenge?: string;
};

class WebAuthnSession {
  private static _registrationSessionData: Map<
    string,
    PublicKeyCredentialCreationOptionsJSON
  > = new Map();

  public static setRegistrationSession(
    username: string,
    data: PublicKeyCredentialCreationOptionsJSON
  ) {
    this._registrationSessionData.set(username, data);
  }

  public static getRegistrationSession(
    username: string
  ): PublicKeyCredentialCreationOptionsJSON | undefined {
    const data = this._registrationSessionData.get(username);
    this._registrationSessionData.delete(username);
    return data;
  }

  private static async _getSession(c: Context) {
    const passowrd = env<{ WEBAUTHN_SESSION_SECRET: string }>(c).WEBAUTHN_SESSION_SECRET;
    const session = await getIronSession<WebAuthnAuthenticationSessionData>(
      c.req.raw,
      c.res,
      {
        cookieName: 'webauthn-session',
        password: passowrd,
        ttl: 60 * 15, // 15 minutes
      }
    );
    return session;
  }

  public static async setAuthenticationSession(
    c: Context,
    data: PublicKeyCredentialRequestOptionsJSON
  ) {
    const session = await this._getSession(c);
    session.challenge = data.challenge;
    await session.save();
  }

  public static async getAuthenticationSession(c: Context):Promise<WebAuthnAuthenticationSessionData> {
    const session = await this._getSession(c);
    const data = {
      ...session
    }
    session.destroy();
    return data;
  }
}

export default WebAuthnSession;
