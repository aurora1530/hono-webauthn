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
  color: var(--color-text-subtle);
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
  border: 3px solid var(--color-border-strong);
  border-top-color: var(--color-primary);
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
