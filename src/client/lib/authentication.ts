import { webauthnClient } from "./rpc/webauthnClient.ts";

async function handleAuthentication() {
  const generateAuthenticationOptionsResponse = await webauthnClient.authentication.generate.$get();
  if (!generateAuthenticationOptionsResponse.ok) {
    alert(`パスキーによる認証の開始に失敗しました。`);
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
    alert(error);
    return;
  }

  location.href = "/";
}

export { handleAuthentication };
