import { css, cx } from "hono/css";
import { tokens } from "../../../ui/theme.js";

type StatusToastProps = {
  message?: string | null;
  variant?: "info" | "error";
  ariaLive?: "polite" | "assertive";
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
  border: 1px solid #0f172a;
  color: #0f172a;
  font-size: 13px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25);
  pointer-events: auto;
`;

const errorClass = css`
  border-color: ${tokens.color.danger};
  color: ${tokens.color.danger};
`;

export const StatusToast = ({
  message,
  variant = "info",
  ariaLive = "polite",
}: StatusToastProps) => {
  if (!message) return null;

  return (
    <div class={containerClass} aria-live={ariaLive}>
      <output class={cx(toastClass, variant === "error" && errorClass)}>{message}</output>
    </div>
  );
};

StatusToast.displayName = "StatusToast";
