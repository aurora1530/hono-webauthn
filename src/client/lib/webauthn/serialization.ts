import { isAuthenticatorTransportFuture } from "../../../lib/auth/transport.js";

const toBase64Url = (buffer: ArrayBuffer): string => {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const credentialFields = (credential: PublicKeyCredential) => {
  const attachment = credential.authenticatorAttachment;
  const authenticatorAttachment: "platform" | "cross-platform" | undefined =
    attachment === "platform" || attachment === "cross-platform" ? attachment : undefined;
  const { appid, credProps } = credential.getClientExtensionResults();
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: "public-key" as const,
    authenticatorAttachment,
    clientExtensionResults: { appid, credProps },
  };
};

export const serializeRegistrationCredential = (credential: Credential) => {
  if (
    !(credential instanceof PublicKeyCredential) ||
    !(credential.response instanceof AuthenticatorAttestationResponse)
  ) {
    throw new Error("不正なパスキー登録応答です。");
  }
  return {
    ...credentialFields(credential),
    response: {
      clientDataJSON: toBase64Url(credential.response.clientDataJSON),
      attestationObject: toBase64Url(credential.response.attestationObject),
      transports: credential.response.getTransports().filter(isAuthenticatorTransportFuture),
    },
  };
};

export const serializeAuthenticationCredential = (credential: Credential) => {
  if (
    !(credential instanceof PublicKeyCredential) ||
    !(credential.response instanceof AuthenticatorAssertionResponse)
  ) {
    throw new Error("不正なパスキー認証応答です。");
  }
  return {
    ...credentialFields(credential),
    response: {
      clientDataJSON: toBase64Url(credential.response.clientDataJSON),
      authenticatorData: toBase64Url(credential.response.authenticatorData),
      signature: toBase64Url(credential.response.signature),
      userHandle: credential.response.userHandle
        ? toBase64Url(credential.response.userHandle)
        : undefined,
    },
  };
};
