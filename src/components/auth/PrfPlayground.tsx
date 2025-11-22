import { css } from "hono/css";
import type { FC } from "hono/jsx";

export const PrfPlayground: FC = () => {
  const wrapperClass = css`
    max-width: 920px;
    margin: 0 auto;
    padding: 32px 16px 40px;
  `;

  const placeholderClass = css`
    border: 1px dashed #cbd5f5;
    border-radius: 16px;
    padding: 32px 24px;
    background: #fff;
    text-align: center;
    color: #475569;
  `;
  return (
    <div class={wrapperClass}>
      <div id="prf-playground-root" class={placeholderClass}>
        <h2 style="margin: 0 0 12px;">WebAuthn PRF 暗号化プレイグラウンド</h2>
        <p style="margin: 0 0 4px;">クライアントコンポーネントを読み込んでいます…</p>
        <p style="margin: 0; font-size: 13px;">
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
