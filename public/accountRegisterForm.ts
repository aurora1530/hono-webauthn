import { handleRegistration } from "./lib/registration.ts";

document.getElementById('account-register-button')?.addEventListener('click', () => {
  handleRegistration(true);
});