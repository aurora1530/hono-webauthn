import { showStatusToast } from "../../components/common/StatusToast.js";

interface AbortControllerHandler {
  abort(): void;
  getSignal(): AbortSignal;
}

const createAbortController = (): AbortControllerHandler => {
  const controller = new AbortController();
  return {
    abort: () => controller.abort(),
    getSignal: () => controller.signal,
  };
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

export { createAbortController, handleWebAuthnAbort, isAbortError };
