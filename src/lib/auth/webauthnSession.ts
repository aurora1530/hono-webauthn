import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';

class WebAuthnSession {
  private static _registrationSessionData: Map<
    string,
    PublicKeyCredentialCreationOptionsJSON
  > = new Map();
  private static _authenticationSessionData: Map<
    string,
    PublicKeyCredentialRequestOptionsJSON
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

  public static setAuthenticationSession(
    userID: string,
    data: PublicKeyCredentialRequestOptionsJSON
  ) {
    this._authenticationSessionData.set(userID, data);
  }

  public static getAuthenticationSession(
    userID: string
  ): PublicKeyCredentialRequestOptionsJSON | undefined {
    const data = this._authenticationSessionData.get(userID);
    this._authenticationSessionData.delete(userID);
    return data;
  }
}

export default WebAuthnSession;
