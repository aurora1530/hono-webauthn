import { handleAuthentication } from "./lib/authentication.ts";

document.getElementById("login-button")?.addEventListener("click", () => {
  handleAuthentication();
});

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(handleAuthentication, 500);
});
