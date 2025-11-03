import { handleRegistration } from "./registration.ts";

document.getElementById('add-passkey-button')?.addEventListener('click', () => {
  handleRegistration(false);
});