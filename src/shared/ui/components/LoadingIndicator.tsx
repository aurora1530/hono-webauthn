import { css, cx, keyframes } from "hono/css";

export type LoadingIndicatorProps = {
  message?: string;
  inline?: boolean;
};

const wrapperClass = css`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: #475569;
  font-size: 0.95rem;
`;

const inlineClass = css`
  display: inline-flex;
  padding: 0;
`;

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const spinnerClass = css`
  width: 1.5rem;
  height: 1.5rem;
  display: inline-block;
  border-radius: 9999px;
  border: 3px solid rgba(148, 163, 184, 0.4);
  border-top-color: var(--primary-color, #2563eb);
  animation: ${spin} 0.8s linear infinite;
`;

export const LoadingIndicator = ({
  message = "読み込み中です...",
  inline = false,
}: LoadingIndicatorProps) => (
  <div class={cx(wrapperClass, inline && inlineClass)} aria-live="polite">
    <span class={spinnerClass} aria-hidden="true" />
    {message && <span>{message}</span>}
  </div>
);

export default LoadingIndicator;
