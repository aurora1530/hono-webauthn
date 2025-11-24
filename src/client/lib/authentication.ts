import { webauthnClient } from "./rpc/webauthnClient.js";
import { showToast } from "./toast.js";

async function handleAuthentication() {
  const generateAuthenticationOptionsResponse = await webauthnClient.authentication.generate.$get();
  if (!generateAuthenticationOptionsResponse.ok) {
    showToast("パスキーによる認証の開始に失敗しました。", { variant: "error" });
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
    showToast(error, { variant: "error" });
    return;
  }

  location.href = "/";
}

export { handleAuthentication };
