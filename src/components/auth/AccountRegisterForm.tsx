import { css, cx } from "hono/css";
import type { FC } from "hono/jsx";
import { buttonClass, inputFieldClass, smallLabelClass, textMutedClass } from "../../ui/theme.js";

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

  const input = cx(
    inputFieldClass,
    css`
      min-width: 220px;
    `,
  );

  const errorText = css`
    color: var(--color-danger);
    font-size: 12px;
  `;

  const hintText = cx(
    textMutedClass,
    smallLabelClass,
    css`
      text-align: center;
    `,
  );

  const errorWrap = css`
    min-height: 16px;
  `;

  const counterText = cx(
    textMutedClass,
    css`
      font-size: 12px;
      min-width: 48px;
      text-align: right;
    `,
  );

  const primaryButton = buttonClass("primary", "md");

  return (
    <div class={container}>
      <div id="username-hint" class={hintText}>
        ユーザー名は1〜64文字、半角英数字のみ。
      </div>
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
        <span id="username-count" class={counterText} aria-live="polite">
          0/64
        </span>
        <button class={primaryButton} id="account-register-button" disabled type="button">
          登録
        </button>
      </div>
      <div class={errorWrap}>
        <span id="username-error" class={errorText} role="alert" aria-live="polite" />
      </div>
      <script src="/public/accountRegisterForm.js" type="module"></script>
    </div>
  );
};

export default AccountRegisterForm;
