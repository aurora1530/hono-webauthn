import { prfClient } from "../rpc/prfClient";
import { serializeAuthenticationCredential } from "../webauthn/serialization.js";
import { createAbortController, handleWebAuthnAbort } from "../webauthn/webauthnAbort";

const base64ToBase64Url = (base64: string): string => {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const requestPrfEvaluation = async (passkeyId: string, prfInputBase64: string) => {
  const generateRes = await prfClient.assertion.generate.$post({
    json: { passkeyId, prfInput: prfInputBase64 },
  });
  if (!generateRes.ok) {
    const error = (await generateRes.json()).error;
    throw new Error(error ?? "PRFオプションの取得に失敗しました");
  }
  const generateJson = await generateRes.json();
  if (base64ToBase64Url(prfInputBase64) !== generateJson.extensions?.prf?.eval?.first) {
    throw new Error("サーバーから返されたPRF入力が一致しません");
  }
  const options = PublicKeyCredential.parseRequestOptionsFromJSON(generateJson);
  const abortControllerHandler = createAbortController();
  let credential: Credential | null = null;
  try {
    credential = await navigator.credentials.get({
      publicKey: options,
      signal: abortControllerHandler.getSignal(),
    });
  } catch (error) {
    handleWebAuthnAbort(error, "認証を中断しました。");
    throw error;
  }
  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("認証情報の取得に失敗しました");
  }

  const credentialJson = serializeAuthenticationCredential(credential);

  const verifyRes = await prfClient.assertion.verify.$post({
    json: { body: credentialJson },
  });
  if (!verifyRes.ok) {
    const error = (await verifyRes.json()).error;
    throw new Error(error ?? "PRF認証の検証に失敗しました");
  }
  const prfResult = credential.getClientExtensionResults().prf?.results?.first as
    | ArrayBuffer
    | undefined;
  if (!prfResult) {
    throw new Error("この環境ではPRF拡張を利用できません");
  }
  return new Uint8Array(prfResult);
};
