import { buttonClass, textMutedClass } from "@ui/theme.js";
import { css, cx } from "hono/css";
import type { FC } from "hono/jsx";

const LoginForm: FC = () => {
  const container = css`
    margin-top: 24px;
    display: flex;
    justify-content: center;
  `;

  const helperText = cx(
    textMutedClass,
    css`
      text-align: center;
      margin-bottom: 8px;
      font-size: 14px;
    `,
  );

  const primaryButton = buttonClass("primary", "md");

  return (
    <div class={container}>
      <div>
        <p class={helperText}>パスキー認証を開始してください。</p>
        <button class={primaryButton} id="login-button" type="button">
          ログイン
        </button>
      </div>
      <script src="/public/loginForm.js" type="module"></script>
    </div>
  );
};

export default LoginForm;
