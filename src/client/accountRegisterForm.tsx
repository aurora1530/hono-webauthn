import { PasskeyExplanationModal } from "./components/common/PasskeyExplanationModal.js";
import { openModal } from "./lib/modal/base.js";
import { handleRegistration, setupUsernameValidation } from "./lib/webauthn/registration.js";

document.getElementById("account-register-button")?.addEventListener("click", () => {
  openModal(
    <PasskeyExplanationModal
      onContinue={() => {
        handleRegistration(true);
      }}
    />,
  );
});

// 入力リアルタイム検証を初期化
setupUsernameValidation();
