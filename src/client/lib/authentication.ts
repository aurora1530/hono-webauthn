import { showStatusToast } from "components/common/StatusToast.js";
import { webauthnClient } from "./rpc/webauthnClient.js";
import {
  clearWebAuthnRequest,
  handleWebAuthnAbort,
  startWebAuthnRequest,
} from "./webauthnAbort.js";

async function handleAuthentication() {
  const generateAuthenticationOptionsResponse = await webauthnClient.authentication.generate.$get();
  if (!generateAuthenticationOptionsResponse.ok) {
    showStatusToast({
      message: "パスキーによる認証の開始に失敗しました。",
      variant: "error",
      ariaLive: "assertive",
    });
    return;
  }

  const options = PublicKeyCredential.parseRequestOptionsFromJSON(
    await generateAuthenticationOptionsResponse.json(),
  );
  console.log(options);

  const signal = startWebAuthnRequest();
  let credential: Credential | null;
  try {
    credential = await navigator.credentials.get({
      publicKey: options,
      signal,
    });
  } catch (error) {
    clearWebAuthnRequest();
    if (handleWebAuthnAbort(error, "パスキーによる認証を中断しました。")) return;
    console.error(error);
    showStatusToast({
      message: "パスキーによる認証に失敗しました。時間をおいて再試行してください。",
      variant: "error",
      ariaLive: "assertive",
    });
    return;
  }
  clearWebAuthnRequest();
  if (!credential) {
    showStatusToast({
      message: "認証情報の取得に失敗しました。",
      variant: "error",
      ariaLive: "assertive",
    });
    return;
  }
  const credentialResponse = await webauthnClient.authentication.verify.$post({
    json: {
      body: credential,
    },
  });

  if (!credentialResponse.ok) {
    const error = (await credentialResponse.json()).error;
    showStatusToast({
      message: `パスキーによる認証に失敗しました: ${error}`,
      variant: "error",
      ariaLive: "assertive",
    });
    return;
  }

  location.href = "/";
}

export { handleAuthentication };
