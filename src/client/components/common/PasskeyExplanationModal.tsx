import { buttonClass } from "@ui/theme.js";
import { css, cx } from "hono/css";
import type { FC } from "hono/jsx";
import { closeModal } from "../../lib/modal/base.js";

type Props = {
  onContinue: () => void;
  onCancel?: () => void;
};

export const PasskeyExplanationModal: FC<Props> = ({ onContinue, onCancel }) => {
  const container = css`
    padding: 24px;
    max-width: 500px;
    max-width: 100%;
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    color: var(--color-text);
  `;

  const title = css`
    font-size: 1.25rem;
    font-weight: bold;
    margin-bottom: 16px;
    color: var(--color-text);
  `;

  const body = css`
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-size: 0.95rem;
    color: var(--color-text);
  `;

  const box = css`
    padding: 16px;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
  `;

  const benefitBox = cx(
    box,
    css`
      background: var(--color-info-surface);
      border-color: var(--color-info-surface);
    `,
  );

  const privacyBox = cx(
    box,
    css`
      background: var(--color-success-surface);
      border-color: var(--color-success-surface);
    `,
  );

  const h3 = css`
    font-weight: 600;
    margin-top: 0px;
    margin-bottom: 8px;
    font-size: 1rem;
  `;

  const ul = css`
    list-style-type: disc;
    padding-left: 20px;
    margin: 0;
  `;

  const actions = css`
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  `;

  const link = css`
    color: var(--color-primary);
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  `;

  const handleContinue = () => {
    closeModal();
    onContinue();
  };

  const handleCancel = () => {
    closeModal();
    onCancel?.();
  };

  return (
    <div class={container}>
      <h2 class={title}>パスキーについて</h2>
      <div class={body}>
        <p>パスキーは、パスワードよりも簡単で安全な新しいサインイン方法です。</p>

        <div class={benefitBox}>
          <h3 class={h3}>メリット</h3>
          <ul class={ul}>
            <li>複雑なパスワードを覚える必要がありません。</li>
            <li>フィッシング詐欺に強く、アカウントの乗っ取りを防ぎます。</li>
          </ul>
        </div>

        <div class={privacyBox}>
          <h3 class={h3}>プライバシーと生体情報</h3>
          <p>
            生体認証を使用する場合でも、
            <strong>指紋や顔のデータがサーバーに送信されることはありません。</strong>
          </p>
          <p style={{ marginTop: "8px" }}>
            生体情報は、お使いのデバイス（スマートフォンやPC）内に安全に保存され、
            デバイスのロック解除と同じ仕組みで本人確認が行われます。
          </p>
        </div>

        <p class={css`font-size: 0.85rem; color: var(--color-text-subtle); margin-top: 8px;`}>
          詳しくは{" "}
          <a
            href="https://www.passkeycentral.org/ja/home/"
            target="_blank"
            rel="noopener noreferrer"
            class={link}
          >
            Passkey Central
          </a>{" "}
          をご覧ください。
        </p>
      </div>

      <div class={actions}>
        <button type="button" onClick={handleCancel} class={buttonClass("ghost", "md")}>
          キャンセル
        </button>
        <button type="button" onClick={handleContinue} class={buttonClass("primary", "md")}>
          次へ進む
        </button>
      </div>
    </div>
  );
};
