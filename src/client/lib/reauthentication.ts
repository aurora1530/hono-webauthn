import { showStatusToast } from "../components/common/StatusToast.js";
import { webauthnClient } from "./rpc/webauthnClient.js";
import {
  clearWebAuthnRequest,
  handleWebAuthnAbort,
  startWebAuthnRequest,
} from "./webauthnAbort.js";

async function handleReauthentication(): Promise<boolean> {
  const generateReauthenticationOptionsResponse =
    await webauthnClient.reauthentication.generate.$get();
  if (!generateReauthenticationOptionsResponse.ok) {
    showStatusToast({
      message: "パスキーによる再認証の開始に失敗しました。",
      variant: "error",
      ariaLive: "assertive",
    });
    return false;
  }

  try {
    const options = PublicKeyCredential.parseRequestOptionsFromJSON(
      await generateReauthenticationOptionsResponse.json(),
    );
    console.log(options);

    const signal = startWebAuthnRequest();
    const credential = await navigator.credentials.get({
      publicKey: options,
      signal,
    });
    clearWebAuthnRequest();
    if (!credential) {
      showStatusToast({
        message: "認証情報の取得に失敗しました。",
        variant: "error",
        ariaLive: "assertive",
      });
      return false;
    }
    const credentialResponse = await webauthnClient.reauthentication.verify.$post({
      json: {
        body: credential,
      },
    });
    if (!credentialResponse.ok) {
      const error = (await credentialResponse.json()).error;
      showStatusToast({
        message: `パスキーによる再認証に失敗しました: ${error}`,
        variant: "error",
        ariaLive: "assertive",
      });
      return false;
    }
    return true;
  } catch (error) {
    clearWebAuthnRequest();
    if (handleWebAuthnAbort(error, "パスキーによる再認証を中断しました。")) return false;
    console.error("Reauthentication error:", error);
    showStatusToast({
      message: "パスキーによる再認証に失敗しました。",
      variant: "error",
      ariaLive: "assertive",
    });
    return false;
  }
}

export { handleReauthentication };
