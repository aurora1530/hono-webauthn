import { PasskeyExplanationModal } from "@feature/passkey/client/components/PasskeyExplanationModal.js";
import { openModalWithJSX } from "@shared/lib/modal/base.js";
import { handleRegistration, setupUsernameValidation } from "../lib/registration.js";

document.getElementById("account-register-button")?.addEventListener("click", () => {
  openModalWithJSX(
    <PasskeyExplanationModal
      onContinue={() => {
        handleRegistration(true);
      }}
    />,
  );
});

// 入力リアルタイム検証を初期化
setupUsernameValidation();
