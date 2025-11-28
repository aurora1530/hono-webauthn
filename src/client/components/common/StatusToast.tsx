import { css, cx } from "hono/css";
import { render } from "hono/jsx/dom";

type StatusToastProps = {
  message?: string | null;
  variant?: "info" | "error" | "success" | "warning";
  ariaLive?: "polite" | "assertive";
};

const containerClass = css`
  position: fixed;
  top: 20px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  pointer-events: none;
`;

const toastClass = css`
  display: inline-flex;
  align-items: center;
  padding: 14px 18px;
  border-radius: 14px;
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  color: var(--color-code-text);
  font-size: 14px;
  letter-spacing: 0.01em;
  box-shadow: var(--shadow-md);
  pointer-events: auto;
  min-width: 260px;
  justify-content: center;
`;

const toastIconClass = css`
  margin-right: 8px;
`;

const errorClass = css`
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: #fff;
`;

const successClass = css`
  background: var(--color-success-surface);
  border-color: var(--color-success);
  color: var(--color-text);
`;

const warnClass = css`
  background: var(--color-warning-surface);
  border-color: var(--color-warning);
  color: var(--color-text);
`;

let _toastTimer: number | undefined;

export const showStatusToast = ({
  message,
  variant = "info",
  ariaLive = "polite",
  duration = 4000,
}: StatusToastProps & { duration?: number }) => {
  const toastRoot = document.getElementById("status-toast-root");
  if (!toastRoot) return;
  if (!message) {
    if (_toastTimer) clearTimeout(_toastTimer);
    toastRoot.hidePopover();
    render(null, toastRoot);
    return;
  }

  toastRoot.showPopover();
  render(
    <div class={containerClass} aria-live={ariaLive}>
      <output
        class={cx(
          toastClass,
          variant === "error" && errorClass,
          variant === "success" && successClass,
          variant === "warning" && warnClass,
        )}
      >
        {variant === "info" && (
          <span class={cx("material-symbols-outlined", toastIconClass)}>info</span>
        )}
        {variant === "error" && (
          <span class={cx("material-symbols-outlined", toastIconClass)}>error</span>
        )}
        {variant === "success" && (
          <span class={cx("material-symbols-outlined", toastIconClass)}>check_circle</span>
        )}
        {variant === "warning" && (
          <span class={cx("material-symbols-outlined", toastIconClass)}>warning</span>
        )}
        {message}
      </output>
    </div>,
    toastRoot,
  );
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = window.setTimeout(() => {
    toastRoot.hidePopover();
    render(null, toastRoot);
  }, duration);
};
