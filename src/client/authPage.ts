import { handleRegistration } from "./lib/registration.ts";

document.getElementById("add-passkey-button")?.addEventListener("click", () => {
  handleRegistration(false);
});
