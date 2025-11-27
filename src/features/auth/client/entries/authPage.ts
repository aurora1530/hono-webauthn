import { handleRegistration } from "../lib/registration.js";

document.getElementById("add-passkey-button")?.addEventListener("click", () => {
  handleRegistration(false);
});
