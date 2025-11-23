import { css, cx } from "hono/css";
import type { FC } from "hono/jsx";
import { pageTitleClass, surfaceClass, textMutedClass } from "../../ui/theme.js";

export const PrfPlayground: FC = () => {
  const wrapperClass = css`
    max-width: 920px;
    margin: 0 auto;
    padding: 32px 16px 40px;
  `;

  const placeholderClass = cx(
    surfaceClass("muted"),
    css`
      border-style: dashed;
      padding: 32px 24px;
      text-align: center;
    `,
  );

  return (
    <div class={wrapperClass}>
      <div id="prf-playground-root" class={placeholderClass}>
        <h2 class={pageTitleClass}>WebAuthn PRF 暗号化プレイグラウンド</h2>
        <p class={textMutedClass}>クライアントコンポーネントを読み込んでいます…</p>
        <p class={cx(textMutedClass, css`font-size: 13px;`)}>
          読み込まれない場合は JavaScript を有効にしてください。
        </p>
      </div>
      <noscript>
        <p style="margin-top: 16px; color: #b91c1c;">
          このページを利用するには JavaScript を有効にしてください。
        </p>
      </noscript>
      <script src="/public/prfPlayground.js" type="module"></script>
    </div>
  );
};

export default PrfPlayground;
