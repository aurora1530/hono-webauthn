import type { FC } from 'hono/jsx';
import { css, cx } from 'hono/css';

const AccountRegisterForm: FC = () => {
  const container = css`
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  `;

  const row = css`
    display: flex;
    gap: 12px;
    align-items: center;
  `;

  const input = css`
    padding: 8px 10px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 14px;
    min-width: 220px;
    background: #fff;
    color: var(--text-color);
  `;
  const errorText = css`
    color: #dc2626;
    font-size: 12px;
  `;

  const buttonBase = css`
    cursor: pointer;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 14px;
    transition: background-color 0.15s ease-in-out, opacity 0.15s;
  `;
  const hintText = css`
    color: #64748b;
    font-size: 12px;
  `;
  const errorWrap = css`
    min-height: 16px;
  `;
  const counterText = css`
    color: #64748b;
    font-size: 12px;
    min-width: 48px;
    text-align: right;
  `;

  const primaryButton = cx(
    buttonBase,
    css`
      background: var(--primary-color);
      color: #fff;
      &:hover {
        background: var(--primary-hover);
      }
      &:active {
        opacity: 0.9;
      }
      &:disabled {
        background: color-mix(in srgb, var(--primary-color) 35%, white);
        cursor: not-allowed;
        opacity: 0.8;
      }
    `
  );

  return (
    <div class={container}>
      <div id="username-hint" class={hintText}>ユーザー名は1〜64文字、半角英数字のみ。</div>
      <div class={row}>
        <input
          class={input}
          type="text"
          name="username"
          id="username"
          placeholder="ユーザー名"
          pattern="[a-zA-Z0-9]{1,64}"
          title="1〜64文字、半角英数字のみ"
          aria-describedby="username-hint username-error"
          aria-invalid="false"
        />
        <span id="username-count" class={counterText} aria-live="polite">0/64</span>
        <button class={primaryButton} id="account-register-button" disabled>登録</button>
      </div>
      <div class={errorWrap}>
        <span id="username-error" class={errorText} role="alert" aria-live="polite" />
      </div>
      <script src="/public/accountRegisterForm.js" type="module"></script>
    </div>
  );
};

export default AccountRegisterForm;
