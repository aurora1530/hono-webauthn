async function handleReauthentication() {
  const generateReauthenticationOptionsResponse = await fetch(
    '/auth/webauthn/reauthentication/generate',
    {
      method: 'GET',
    }
  );

  const options = PublicKeyCredential.parseRequestOptionsFromJSON(
    await generateReauthenticationOptionsResponse.json()
  );
  console.log(options);

  const credential = await navigator.credentials.get({ publicKey: options });
  const credentialResponse = await fetch('/auth/webauthn/reauthentication/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credential),
  });

  const credentialJson = await credentialResponse.json();
  if (!credentialJson.success) {
    alert(credentialJson.message);
    return false;
  }

  return true;
}

export { handleReauthentication };
