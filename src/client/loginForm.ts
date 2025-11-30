import { handleAuthentication } from "./lib/webauthn/authentication.js";

document.getElementById("login-button")?.addEventListener("click", () => {
  handleAuthentication();
});

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(handleAuthentication, 500);
});
