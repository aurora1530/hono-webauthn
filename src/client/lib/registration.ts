import { authClient } from "./rpc/authClient.ts";
import { closeModal, openModal } from "./modal.ts";
import { handleReauthentication } from "./reauthentication.ts";
import { webauthnClient } from "./rpc/webauthnClient.ts";

function validateUsernameAndUpdateUI(): boolean {
  const usernameEle = document.getElementById('username');
  if (!usernameEle || !(usernameEle instanceof HTMLInputElement)) return false;
  const errorEle = document.getElementById('username-error');
  const registerBtn = document.getElementById('account-register-button');
  const username = usernameEle.value.trim();
  const alnum = /^[a-zA-Z0-9]+$/;

  let valid = true;
  let message = '';
  if (username.length === 0) {
    valid = false;
    message = '';
  } else if (username.length < 1 || username.length > 64) {
    valid = false;
    message = 'ユーザー名は1〜64文字で入力してください。';
  } else if (!alnum.test(username)) {
    valid = false;
    message = 'ユーザー名は半角英数字のみ使用できます。';
  }

  if (errorEle) errorEle.textContent = message;
  usernameEle.setAttribute('aria-invalid', valid ? 'false' : 'true');
  if (registerBtn instanceof HTMLButtonElement) registerBtn.disabled = !valid;
  return valid;
}

function setupUsernameValidation() {
  const usernameEle = document.getElementById('username');
  if (!usernameEle || !(usernameEle instanceof HTMLInputElement)) return;
  const counterEle = document.getElementById('username-count');
  const updateCount = () => {
    const trimmedLen = usernameEle.value.trim().length;
    if (counterEle) counterEle.textContent = `${trimmedLen}/64`;
  };
  usernameEle.addEventListener('input', () => {
    validateUsernameAndUpdateUI();
    updateCount();
  });
  // 初期状態の反映
  validateUsernameAndUpdateUI();
  updateCount();
}

async function handleRegistration(isNewAccount: boolean = true) {
  if (isNewAccount) {
    const usernameEle = document.getElementById('username');
    if (!usernameEle || !(usernameEle instanceof HTMLInputElement)) {
      return;
    }
    const errorEle = document.getElementById('username-error');
    const username = usernameEle.value.trim();
    if (!validateUsernameAndUpdateUI()) return;
    if (errorEle) errorEle.textContent = '';
    const usernameRegisterResponse = await authClient.register.$post({
      json: { username }
    })

    if (!usernameRegisterResponse.ok) {
      const error = (await usernameRegisterResponse.json()).error
      if (errorEle) errorEle.textContent = error;
      else alert(error);
      return;
    }
  } else {
    openModal(`<p>再認証を開始します。</p>`);
    const reauthSuccess = await handleReauthentication();
    if (!reauthSuccess) {
      openModal('<p>再認証に失敗しました。パスキーの作成は行われませんでした。</p>');
      return;
    }
    closeModal();
  }

  const generateRegistrationOptionsResponse = await webauthnClient.registration.generate.$get();
  if (!generateRegistrationOptionsResponse.ok) {
    const error = (await generateRegistrationOptionsResponse.json()).error
    return alert(`パスキーの作成に失敗しました。エラー: ${error}`);
  }
  const options = PublicKeyCredential.parseCreationOptionsFromJSON(await generateRegistrationOptionsResponse.json());
  console.log(options);

  const credential = await navigator.credentials.create({ publicKey: options });
  const credentialResponse = await webauthnClient.registration.verify.$post({
    'json': {
      body: credential
    }
  });

  if (!credentialResponse.ok) {
    const error = (await credentialResponse.json()).error
    alert(error);
    return;
  }

  if (isNewAccount) {
    alert('新規登録が完了しました');
    location.href = '/auth/login';
  } else {
    alert('パスキーの作成が完了しました');
    location.reload();
  }
}

export { handleRegistration, setupUsernameValidation };
