import { handleRegistration, setupUsernameValidation } from "./lib/registration.ts";

document.getElementById('account-register-button')?.addEventListener('click', () => {
  handleRegistration(true);
});

// 入力リアルタイム検証を初期化
setupUsernameValidation();
