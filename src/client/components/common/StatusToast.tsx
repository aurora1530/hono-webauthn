import { css, cx } from "hono/css";
import { tokens } from "../../../ui/theme.js";

type StatusToastProps = {
  message?: string | null;
  variant?: "info" | "error";
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
  z-index: 2000;
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

const errorClass = css`
  background: ${tokens.color.danger};
  border-color: ${tokens.color.danger};
  color: #fff;
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
