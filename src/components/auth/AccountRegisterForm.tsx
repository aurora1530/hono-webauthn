import type { FC } from 'hono/jsx';
import { css, cx } from 'hono/css';

const AccountRegisterForm: FC = () => {
  const container = css`
    margin-top: 24px;
    display: flex;
    justify-content: center;
  `;

  const row = css`
    display: flex;
    gap: 12px;
    align-items: center;
  `;

  const input = css`
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    min-width: 220px;
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
      background: #10b981;
      color: #fff;
      &:hover {
        background: #059669;
      }
      &:active {
        opacity: 0.9;
      }
    `
  );

  return (
    <div class={container}>
      <div class={row}>
        <input class={input} type="text" name="username" id="username" placeholder="ユーザー名" />
        <button class={primaryButton} id="account-register-button">Register</button>
      </div>
      <script src="/public/accountRegisterForm.js" type="module"></script>
    </div>
  );
};

export default AccountRegisterForm;

