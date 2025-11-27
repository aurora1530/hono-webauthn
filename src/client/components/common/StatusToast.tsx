import { css, cx } from "hono/css";
import { render } from "hono/jsx/dom";
import { tokens } from "../../../ui/theme.js";

type StatusToastProps = {
  message?: string | null;
  variant?: "info" | "error" | "success";
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
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: ${tokens.color.surface};
  font-size: 14px;
  letter-spacing: 0.01em;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  pointer-events: auto;
  min-width: 260px;
  justify-content: center;
`;

const toastIconClass = css`
  margin-right: 8px;
`;

const errorClass = css`
  background: ${tokens.color.danger};
  border-color: ${tokens.color.danger};
  color: #fff;
`;

const successClass = css`
  background: color-mix(in srgb, ${tokens.color.success} 70%, white);
  border-color: color-mix(in srgb, ${tokens.color.success} 55%, white);
  color: #0f172a;

  @media (prefers-color-scheme: dark) {
    background: color-mix(in srgb, ${tokens.color.success} 75%, #0b172a);
    border-color: color-mix(in srgb, ${tokens.color.success} 60%, #0b172a);
    color: #f8fafc;
  }
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
      <output class={cx(toastClass, variant === "error" && errorClass, variant === "success" && successClass)}>
        {variant === "info" && (
          <span class={cx("material-symbols-outlined", toastIconClass)}>info</span>
        )}
        {variant === "error" && (
          <span class={cx("material-symbols-outlined", toastIconClass)}>error</span>
        )}
        {variant === "success" && (
          <span class={cx("material-symbols-outlined", toastIconClass)}>check_circle</span>
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
