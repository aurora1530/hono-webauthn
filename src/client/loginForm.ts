import { handleAuthentication } from "./lib/authentication.ts";

document.getElementById('login-button')?.addEventListener('click', () => {
  handleAuthentication();
});
