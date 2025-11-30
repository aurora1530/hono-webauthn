import { showStatusToast } from "../components/common/StatusToast.js";
import { closeModal } from "./modal/base.js";
import { openMessageModal } from "./modal/message.js";
import { handleReauthentication } from "./reauthentication.js";
import { authClient } from "./rpc/authClient.js";
import { webauthnClient } from "./rpc/webauthnClient.js";
import {
  clearWebAuthnRequest,
  handleWebAuthnAbort,
  startWebAuthnRequest,
} from "./webauthnAbort.js";

function validateUsernameAndUpdateUI(): boolean {
  const usernameEle = document.getElementById("username");
  if (!usernameEle || !(usernameEle instanceof HTMLInputElement)) return false;
  const errorEle = document.getElementById("username-error");
  const registerBtn = document.getElementById("account-register-button");
  const username = usernameEle.value.trim();
  const alnum = /^[a-zA-Z0-9]+$/;

  let valid = true;
  let message = "";
  if (username.length === 0) {
    valid = false;
    message = "";
  } else if (username.length < 1 || username.length > 64) {
    valid = false;
    message = "ユーザー名は1〜64文字で入力してください。";
  } else if (!alnum.test(username)) {
    valid = false;
    message = "ユーザー名は半角英数字のみ使用できます。";
  }

  if (errorEle) errorEle.textContent = message;
  usernameEle.setAttribute("aria-invalid", valid ? "false" : "true");
  if (registerBtn instanceof HTMLButtonElement) registerBtn.disabled = !valid;
  return valid;
}

function setupUsernameValidation() {
  const usernameEle = document.getElementById("username");
  if (!usernameEle || !(usernameEle instanceof HTMLInputElement)) return;
  const counterEle = document.getElementById("username-count");
  const updateCount = () => {
    const trimmedLen = usernameEle.value.trim().length;
    if (counterEle) counterEle.textContent = `${trimmedLen}/64`;
  };
  usernameEle.addEventListener("input", () => {
    validateUsernameAndUpdateUI();
    updateCount();
  });
  // 初期状態の反映
  validateUsernameAndUpdateUI();
  updateCount();
}

async function handleRegistration(isNewAccount: boolean = true) {
  if (isNewAccount) {
    const usernameEle = document.getElementById("username");
    if (!usernameEle || !(usernameEle instanceof HTMLInputElement)) {
      return;
    }
    const errorEle = document.getElementById("username-error");
    const username = usernameEle.value.trim();
    if (!validateUsernameAndUpdateUI()) return;
    if (errorEle) errorEle.textContent = "";
    const usernameRegisterResponse = await authClient.register.$post({
      json: { username },
    });

    if (!usernameRegisterResponse.ok) {
      const error = (await usernameRegisterResponse.json()).error;
      if (errorEle) errorEle.textContent = error;
      else alert(error); // Fatal error なので alert で良い
      return;
    }
  } else {
    openMessageModal(`再認証を開始します。`, { loading: true });
    const reauthSuccess = await handleReauthentication();
    if (!reauthSuccess) {
      openMessageModal("再認証に失敗しました。パスキーの作成は行われませんでした。");
      return;
    }
    closeModal();
  }

  const generateRegistrationOptionsResponse = await webauthnClient.registration.generate.$get();
  if (!generateRegistrationOptionsResponse.ok) {
    const error = (await generateRegistrationOptionsResponse.json()).error;
    openMessageModal(`パスキーの作成に失敗しました。エラー: ${error}`);
    return;
  }
  const options = PublicKeyCredential.parseCreationOptionsFromJSON(
    await generateRegistrationOptionsResponse.json(),
  );
  console.log(options);

  const signal = startWebAuthnRequest();
  let credential: Credential | null;
  try {
    credential = await navigator.credentials.create({
      publicKey: options,
      signal,
    });
  } catch (error) {
    clearWebAuthnRequest();
    if (handleWebAuthnAbort(error, "パスキーの作成を中断しました。")) return;
    console.error(error);
    showStatusToast({
      message: "パスキーの作成に失敗しました。時間をおいて再試行してください。",
      variant: "error",
      ariaLive: "assertive",
    });
    return;
  }
  clearWebAuthnRequest();
  if (!credential) {
    showStatusToast({
      message: "認証情報の取得に失敗しました。",
      variant: "error",
      ariaLive: "assertive",
    });
    return;
  }
  const credentialResponse = await webauthnClient.registration.verify.$post({
    json: {
      body: credential,
    },
  });

  if (!credentialResponse.ok) {
    const error = (await credentialResponse.json()).error;
    openMessageModal(`パスキーの作成に失敗しました。エラー: ${error}`);
    return;
  }

  if (isNewAccount) {
    openMessageModal(`新規登録が完了しました。`, {
      onClose: () => {
        location.href = "/auth/login";
      },
    });
  } else {
    openMessageModal(`パスキーの作成が完了しました。`, {
      onClose: () => {
        location.reload();
      },
    });
  }
}

export { handleRegistration, setupUsernameValidation };
