import { render } from "hono/jsx/dom";
import { PrfPlaygroundApp } from "./components/PrfPlaygroundApp.js";

const root = document.getElementById("prf-playground-root");
const debugMode = root?.dataset.debugMode === "true";

if (root) {
  render(<PrfPlaygroundApp debugMode={debugMode} />, root);
}
