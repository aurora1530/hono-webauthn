import { handleRegistration } from "./registration.ts";

document.getElementById('account-register-button')?.addEventListener('click', () => {
  handleRegistration(true);
});