async function handleAuthentication() {
  const generateAuthenticationOptionsResponse = await fetch(
    '/auth/webauthn/authentication/generate',
    {
      method: 'GET',
    }
  );
  const options = PublicKeyCredential.parseRequestOptionsFromJSON(
    await generateAuthenticationOptionsResponse.json()
  );
  console.log(options);

  const credential = await navigator.credentials.get({ publicKey: options });
  const credentialResponse = await fetch('/auth/webauthn/authentication/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credential),
  });

  const credentialJson = await credentialResponse.json();
  if (!credentialJson.success) {
    alert(credentialJson.message);
    return;
  }

  location.href = '/';
}

export { handleAuthentication };