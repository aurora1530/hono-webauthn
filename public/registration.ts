async function reauthenticateForPasskeyAddition() {
  try {
    const generateResponse = await fetch('/auth/webauthn/reauthentication/generate', {
      method: 'GET',
    });

    const generateJson = await generateResponse.json();

    if (!generateResponse.ok) {
      alert(generateJson.message ?? '再認証の開始に失敗しました。');
      return false;
    }

    const options = PublicKeyCredential.parseRequestOptionsFromJSON(generateJson);

    const credential = await navigator.credentials.get({ publicKey: options });

    if (!credential) {
      alert('再認証がキャンセルされました。');
      return false;
    }

    const verifyResponse = await fetch('/auth/webauthn/reauthentication/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credential),
    });

    const verifyJson = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyJson.success) {
      alert(verifyJson.message ?? '再認証に失敗しました。もう一度お試しください。');
      return false;
    }

    return true;
  } catch (error) {
    console.error(error);
    alert('再認証に失敗しました。もう一度お試しください。');
    return false;
  }
}

async function handleRegistration(isNewAccount: boolean = true) {
  if (isNewAccount) {
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
  } else {
    const reauthenticated = await reauthenticateForPasskeyAddition();
    if (!reauthenticated) {
      return;
    }
  }

  const generateRegistrationOptionsResponse = await fetch('/auth/webauthn/registration/generate', {
    method: 'GET',
  });
  const options = PublicKeyCredential.parseCreationOptionsFromJSON(
    await generateRegistrationOptionsResponse.json()
  );
  console.log(options);

  const credential = await navigator.credentials.create({ publicKey: options });

  if (!credential) {
    alert('パスキーの登録がキャンセルされました。');
    return;
  }

  const credentialResponse = await fetch('/auth/webauthn/registration/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credential),
  });

  const credentialJson = await credentialResponse.json();
  if (!credentialResponse.ok || !credentialJson.success) {
    alert(credentialJson.message);
    return;
  }

  if (isNewAccount) {
    alert('新規登録が完了しました');
    location.href = '/auth/login';
  } else {
    alert('パスキーの追加が完了しました');
    location.reload();
  }
}
