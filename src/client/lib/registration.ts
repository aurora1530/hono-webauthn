import { closeModal, openModal } from "./modal.ts";
import { handleReauthentication } from "./reauthentication.ts";

async function handleRegistration(isNewAccount: boolean = true) {
  if (isNewAccount) {
    const usernameEle = document.getElementById('username');
    if (!usernameEle || !(usernameEle instanceof HTMLInputElement)) {
      return;
    }
    const errorEle = document.getElementById('username-error');
    const username = usernameEle.value.trim();
    if (username.length < 1 || username.length > 64) {
      if (errorEle) errorEle.textContent = 'ユーザー名は1〜64文字で入力してください。';
      usernameEle.focus();
      return;
    } else {
      if (errorEle) errorEle.textContent = '';
    }
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
      if (errorEle) errorEle.textContent = json.message ?? '登録に失敗しました。';
      else alert(json.message);
      return;
    }
  } else {
    openModal(`<p>再認証を開始します。</p>`);
    const reauthSuccess = await handleReauthentication();
    if (!reauthSuccess) {
      openModal('<p>再認証に失敗しました。パスキーの追加は行われませんでした。</p>');
      return;
    }
    closeModal();
  }

  const generateRegistrationOptionsResponse = await fetch('/auth/webauthn/registration/generate', {
    method: 'GET',
  });
  const options = PublicKeyCredential.parseCreationOptionsFromJSON(await generateRegistrationOptionsResponse.json());
  console.log(options);

  const credential = await navigator.credentials.create({ publicKey: options });
  const credentialResponse = await fetch('/auth/webauthn/registration/verify', {
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

  if(isNewAccount) {
    alert('新規登録が完了しました');
    location.href = '/auth/login';
  } else {
    alert('パスキーの追加が完了しました');
    location.reload();
  }
}

export { handleRegistration };
