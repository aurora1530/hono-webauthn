import { render } from "hono/jsx/dom";
import { AccountRegisterFormApp } from "./components/auth/AccountRegisterFormApp.js";

const root = document.getElementById("account-register-root");

if (root) {
  render(<AccountRegisterFormApp />, root);
}
