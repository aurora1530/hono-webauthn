import { render } from "hono/jsx/dom";
import { PrfPlaygroundApp } from "./components/PrfPlaygroundApp.js";

const root = document.getElementById("prf-playground-root");

if (root) {
  render(<PrfPlaygroundApp />, root);
}
