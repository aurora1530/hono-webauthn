import { webauthnClient } from "./rpc/webauthnClient.js";
import { showToast } from "./toast.js";

async function handleReauthentication(): Promise<boolean> {
  const generateReauthenticationOptionsResponse =
    await webauthnClient.reauthentication.generate.$get();
  if (!generateReauthenticationOptionsResponse.ok) {
    showToast("パスキーによる再認証の開始に失敗しました。", { variant: "error" });
    return false;
  }

  try {
    const options = PublicKeyCredential.parseRequestOptionsFromJSON(
      await generateReauthenticationOptionsResponse.json(),
    );
    console.log(options);

    const credential = await navigator.credentials.get({ publicKey: options });
    const credentialResponse = await webauthnClient.reauthentication.verify.$post({
      json: {
        body: credential,
      },
    });
    if (!credentialResponse.ok) {
      const error = (await credentialResponse.json()).error;
      showToast(error, { variant: "error" });
      return false;
    }
    return true;
  } catch (error) {
    console.error("Reauthentication error:", error);
    return false;
  }
}

export { handleReauthentication };
