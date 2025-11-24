import { css, cx } from "hono/css";
import { tokens } from "../ui/theme.js";

export type ToastVariant = "info" | "error";

export type ToastOptions = {
  /**
   * Toast type. Use "error" for non-fatal error states.
   */
  variant?: ToastVariant;
  /**
   * Duration to display the toast in milliseconds.
   */
  durationMs?: number;
};

const containerClass = css`
  position: fixed;
  bottom: 16px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 2000;
`;

const toastClass = css`
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 9999px;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.text};
  color: ${tokens.color.text};
  font-size: 13px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25);
  pointer-events: auto;
`;

const toastErrorClass = css`
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.danger};
  color: ${tokens.color.danger};
`;

let container: HTMLDivElement | null = null;
let hideTimer: number | null = null;

const ensureContainer = () => {
  if (!container) {
    container = document.createElement("div");
    container.className = containerClass;
    container.setAttribute("aria-live", "polite");
    document.body.append(container);
  }
  return container;
};

export const clearToast = () => {
  if (hideTimer) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (container) {
    container.replaceChildren();
  }
};

export const showToast = (message: string, options?: ToastOptions) => {
  const { variant = "info", durationMs = 4000 } = options ?? {};
  const target = ensureContainer();
  const toast = document.createElement("output");
  toast.className = cx(toastClass, variant === "error" && toastErrorClass);
  toast.textContent = message;

  target.replaceChildren(toast);

  if (hideTimer) {
    window.clearTimeout(hideTimer);
  }
  hideTimer = window.setTimeout(() => {
    if (target.contains(toast)) {
      toast.remove();
    }
  }, durationMs);
};
