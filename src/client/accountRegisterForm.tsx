import { PasskeyExplanationModal } from "./components/common/PasskeyExplanationModal.js";
import { openModalWithJSX } from "./lib/modal/base.js";
import { handleRegistration, setupUsernameValidation } from "./lib/registration.js";

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
