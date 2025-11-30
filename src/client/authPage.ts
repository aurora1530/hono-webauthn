import { handleRegistration } from "./lib/webauthn/registration.js";

document.getElementById("add-passkey-button")?.addEventListener("click", () => {
  handleRegistration(false);
});
