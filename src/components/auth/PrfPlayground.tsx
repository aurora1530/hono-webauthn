import { css, cx } from "hono/css";
import type { FC } from "hono/jsx";
import { useRequestContext } from "hono/jsx-renderer";
import { loginSessionController } from "../../lib/auth/loginSession.js";
import { pageTitleClass, surfaceClass, textMutedClass } from "../../ui/theme.js";

export const PrfPlayground: FC = async () => {
  const c = useRequestContext();
  const loginState = await loginSessionController.getLoginState(c);
  const debugMode = loginState.state === "LOGGED_IN" && !!loginState.userData.debugMode;

  const wrapperClass = css`
    max-width: 920px;
  `;

  const placeholderClass = cx(
    surfaceClass("muted"),
    css`
      border-style: dashed;
      padding: 32px 0;
      text-align: center;
    `,
  );

  return (
    <div class={wrapperClass}>
      <div
        id="prf-playground-root"
        class={placeholderClass}
        data-debug-mode={debugMode ? "true" : "false"}
      >
        <h2 class={pageTitleClass}>WebAuthn PRF 暗号化プレイグラウンド</h2>
        <p class={textMutedClass}>クライアントコンポーネントを読み込んでいます…</p>
        <p class={cx(textMutedClass, css`font-size: 13px;`)}>
          読み込まれない場合は JavaScript を有効にしてください。
        </p>
      </div>
      <noscript>
        <p style="margin-top: 16px; color: var(--color-danger);">
          このページを利用するには JavaScript を有効にしてください。
        </p>
      </noscript>
      <script src="/public/prfPlayground.js" type="module"></script>
    </div>
  );
};

export default PrfPlayground;
