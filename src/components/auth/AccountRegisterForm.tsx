import { css, cx } from "hono/css";
import type { FC } from "hono/jsx";
import { textMutedClass } from "../../ui/theme.js";

const AccountRegisterForm: FC = () => {
  const container = css`
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  `;

  const placeholder = cx(
    textMutedClass,
    css`
      width: min(520px, 100%);
      padding: 32px 16px;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      text-align: center;
      box-sizing: border-box;
    `,
  );

  const helper = css`
    font-size: 13px;
    margin-top: 8px;
  `;

  return (
    <div class={container}>
      <div id="account-register-root" class={placeholder}>
        <p>アカウント登録フォームを読み込んでいます…</p>
        <p class={helper}>読み込まれない場合は JavaScript を有効にしてください。</p>
      </div>
      <noscript>
        <p style="color: var(--color-danger);">このフォームを利用するには JavaScript が必要です。</p>
      </noscript>
      <script src="/public/accountRegisterForm.js" type="module"></script>
    </div>
  );
};

export default AccountRegisterForm;
