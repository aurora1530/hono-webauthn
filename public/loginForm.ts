import { handleAuthentication } from "./authentication.ts";

document.getElementById('login-button')?.addEventListener('click', () => {
  handleAuthentication();
});
