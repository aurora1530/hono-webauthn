import { showStatusToast } from "../components/common/StatusToast.js";

let activeWebAuthnController: AbortController | null = null;

const startWebAuthnRequest = (): AbortSignal => {
  if (activeWebAuthnController) {
    activeWebAuthnController.abort();
  }
  activeWebAuthnController = new AbortController();
  return activeWebAuthnController.signal;
};

const clearWebAuthnRequest = () => {
  activeWebAuthnController = null;
};

const abortOngoingWebAuthnRequest = () => {
  if (activeWebAuthnController) {
    activeWebAuthnController.abort();
    activeWebAuthnController = null;
  }
};

const isAbortError = (error: unknown): error is DOMException =>
  error instanceof DOMException &&
  (error.name === "AbortError" || error.name === "NotAllowedError");

const handleWebAuthnAbort = (error: unknown, message: string) => {
  if (!isAbortError(error)) return false;
  showStatusToast({
    message,
    variant: "info",
    ariaLive: "polite",
  });
  return true;
};

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", abortOngoingWebAuthnRequest);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      abortOngoingWebAuthnRequest();
    }
  });
}

export {
  abortOngoingWebAuthnRequest,
  clearWebAuthnRequest,
  handleWebAuthnAbort,
  isAbortError,
  startWebAuthnRequest,
};
