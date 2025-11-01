import type { FC } from 'hono/jsx';
import { css, cx } from 'hono/css';

const LoginForm: FC = () => {
  const container = css`
    margin-top: 24px;
    display: flex;
    justify-content: center;
  `;

  const buttonBase = css`
    cursor: pointer;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 14px;
    transition: background-color 0.15s ease-in-out, opacity 0.15s;
  `;

  const primaryButton = cx(
    buttonBase,
    css`
      background: #2563eb;
      color: #fff;
      &:hover {
        background: #1d4ed8;
      }
      &:active {
        opacity: 0.9;
      }
    `
  );

  return (
    <div class={container}>
      <div>
        <button class={primaryButton} onclick="handleAuthentication()">Login</button>
      </div>
      <script src="/public/authentication.ts"></script>
    </div>
  );
};

export default LoginForm;

