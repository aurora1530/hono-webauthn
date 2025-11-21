import { webauthnClient } from "./rpc/webauthnClient.ts";

async function handleReauthentication(): Promise<boolean> {
  const generateReauthenticationOptionsResponse =
    await webauthnClient.reauthentication.generate.$get();
  if (!generateReauthenticationOptionsResponse.ok) {
    alert(`パスキーによる再認証の開始に失敗しました。`);
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
      alert(error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Reauthentication error:", error);
    return false;
  }
}

export { handleReauthentication };
