async function handleRegistration() {
  const usernameEle = document.getElementById('username');
  if (!usernameEle || !(usernameEle instanceof HTMLInputElement)) {
    return;
  }
  const username = usernameEle.value;
  const usernameRegisterResponse = await fetch('/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: username,
    }),
  });
  const json = await usernameRegisterResponse.json();
  if (!json.success) {
    alert(json.message);
    return;
  }

  const generateRegistrationOptionsResponse = await fetch('/auth/webauthn/generate', {
    method: 'GET',
  });
  const options = PublicKeyCredential.parseCreationOptionsFromJSON(await generateRegistrationOptionsResponse.json());
  console.log(options);

  const credential = await navigator.credentials.create({ publicKey: options });
  const credentialResponse = await fetch('/auth/webauthn/verify', {
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

  location.href = '/auth/login';
}
