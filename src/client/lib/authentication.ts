import { showStatusToast } from "components/common/StatusToast.js";
import { webauthnClient } from "./rpc/webauthnClient.js";

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

  const credential = await navigator.credentials.get({ publicKey: options });
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
