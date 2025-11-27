import { handleAuthentication } from "../lib/authentication.js";

document.getElementById("login-button")?.addEventListener("click", () => {
  handleAuthentication();
});

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(handleAuthentication, 500);
});
