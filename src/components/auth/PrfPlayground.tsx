import { css, cx } from "hono/css";
import type { FC } from "hono/jsx";

interface PrfPlaygroundProps {
  passkeys: Array<{
    id: string;
    name: string;
  }>;
}

const MAX_PRF_LABEL_LENGTH = 120;
const MAX_PRF_PLAINTEXT_CHARS = 3500;

export const PrfPlayground: FC<PrfPlaygroundProps> = ({ passkeys }) => {
  const containerClass = css`
    max-width: 920px;
    margin: 0 auto;
    padding: 32px 16px 40px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  `;

  const headerClass = css`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 12px;

    h2 {
      margin: 0 0 8px;
      font-size: 24px;
    }

    p {
      margin: 0;
      color: #475569;
      max-width: 600px;
      line-height: 1.5;
    }
  `;

  const buttonBaseClass = css`
    cursor: pointer;
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 13px;
    transition: background-color 0.15s ease-in-out, opacity 0.15s;
  `;

  const navButtonClass = cx(
    buttonBaseClass,
    css`
      background: #0f172a;
      color: #fff;
      text-decoration: none;
      &:hover {
        opacity: 0.9;
      }
    `,
  );

  const sectionClass = css`
    border: 1px solid #cbd5f5;
    border-radius: 16px;
    background: #f8fafc;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  `;

  const gridClass = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
  `;

  const fieldClass = css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;

    label {
      font-weight: 600;
      color: #0f172a;
    }

    select,
    input,
    textarea {
      border: 1px solid #cbd5f5;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 14px;
      width: 100%;
      box-sizing: border-box;
      background: #fff;
    }
  `;

  const textareaClass = css`
    grid-column: 1 / -1;
  `;

  const buttonRowClass = css`
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  `;

  const primaryButtonClass = cx(
    buttonBaseClass,
    css`
      background: #2563eb;
      color: #fff;
      &:hover {
        background: #1d4ed8;
      }
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  );

  const secondaryButtonClass = cx(
    buttonBaseClass,
    css`
      background: #e2e8f0;
      color: #0f172a;
      &:hover {
        background: #cbd5f5;
      }
    `,
  );

  const statusClass = css`
    min-height: 20px;
    font-size: 13px;
    color: #475569;
    &.error {
      color: #b91c1c;
    }
  `;

  const outputClass = css`
    border: 1px dashed #94a3b8;
    border-radius: 12px;
    padding: 16px;
    background: #fff;
  `;

  const outputGridClass = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
    font-size: 13px;

    code {
      display: block;
      background: #0f172a;
      color: #e2e8f0;
      padding: 6px 8px;
      border-radius: 6px;
      word-break: break-all;
    }
  `;

  const entriesHeaderClass = css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  `;

  const entriesContainerClass = css`
    display: flex;
    flex-direction: column;
    gap: 14px;
  `;

  const entryCardClass = css`
    border: 1px solid #cbd5f5;
    border-radius: 12px;
    padding: 16px;
    background: #fff;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `;

  const entryMetaClass = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
    font-size: 12px;
    color: #475569;

    div {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    span {
      font-weight: 600;
      color: #0f172a;
    }

    code {
      display: block;
      padding: 6px 8px;
      border-radius: 6px;
      background: #0f172a;
      color: #e2e8f0;
      word-break: break-all;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
  `;

  const entryActionsClass = css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  `;

  const entryChipClass = css`
    font-size: 11px;
    background: #e2e8f0;
    color: #0f172a;
    padding: 2px 8px;
    border-radius: 999px;
    display: inline-flex;
    gap: 4px;
    align-items: center;
  `;

  const infoMessageClass = css`
    margin: 0;
    padding: 12px 16px;
    border-radius: 8px;
    background: #fff8eb;
    color: #92400e;
    font-size: 13px;
  `;

  const controlsDisabled = passkeys.length === 0;

  return (
    <div id="prf-playground-root" class={containerClass}>
      <div class={headerClass}>
        <div>
          <h2>WebAuthn PRF 暗号化プレイグラウンド</h2>
          <p>
            パスキー由来のシークレットを使い、クライアント側のみで AES-128-GCM
            による暗号化を行います。
            生成された暗号文だけがサーバーに保存され、復号にも同じAuthenticatorが必要になります。
          </p>
        </div>
        <a class={navButtonClass} href="/auth/passkey-management">
          パスキー管理へ戻る
        </a>
      </div>
      {controlsDisabled && (
        <p class={infoMessageClass}>
          まずパスキーを 1 件以上登録してください。登録後、このページから暗号化・復号を試せます。
        </p>
      )}
      <section class={sectionClass}>
        <div class={gridClass}>
          <div class={fieldClass}>
            <label htmlFor="prf-passkey-select">使用するパスキー</label>
            <select id="prf-passkey-select" defaultValue="" disabled={controlsDisabled}>
              <option value="">選択してください</option>
              {passkeys.map((passkey) => (
                <option key={passkey.id} value={passkey.id} data-passkey-name={passkey.name}>
                  {passkey.name}
                </option>
              ))}
            </select>
          </div>
          <div class={fieldClass}>
            <label htmlFor="prf-label-input">ラベル (任意)</label>
            <input
              id="prf-label-input"
              type="text"
              maxLength={MAX_PRF_LABEL_LENGTH}
              placeholder="例: 家計簿バックアップ"
              disabled={controlsDisabled}
            />
          </div>
          <div class={cx(fieldClass, textareaClass)}>
            <label htmlFor="prf-plaintext-input">
              平文 (最大約 {MAX_PRF_PLAINTEXT_CHARS} バイト)
            </label>
            <textarea
              id="prf-plaintext-input"
              rows={4}
              data-max-bytes={MAX_PRF_PLAINTEXT_CHARS}
              placeholder="暗号化したいテキストを入力してください"
              disabled={controlsDisabled}
            ></textarea>
          </div>
        </div>
        <div class={buttonRowClass}>
          <button
            id="prf-encrypt-button"
            class={primaryButtonClass}
            type="button"
            disabled={controlsDisabled}
          >
            暗号化して保存
          </button>
          <button
            id="prf-refresh-button"
            class={secondaryButtonClass}
            type="button"
            disabled={controlsDisabled}
          >
            一覧を更新
          </button>
        </div>
        <output id="prf-status-message" class={statusClass} aria-live="polite"></output>
        <div id="prf-latest-output" class={outputClass} hidden>
          <h4>直近の結果</h4>
          <div id="prf-output-content" class={outputGridClass}></div>
        </div>
        <div class={entriesHeaderClass}>
          <h4>暗号化済みデータ</h4>
          <span id="prf-entries-count" class={entryChipClass}></span>
        </div>
        <div
          id="prf-entries-container"
          class={entriesContainerClass}
          data-empty="暗号化済みのデータはまだありません。"
          data-entry-card-class={entryCardClass}
          data-entry-meta-class={entryMetaClass}
          data-entry-actions-class={entryActionsClass}
        ></div>
      </section>
      <script src="/public/prfPlayground.js" type="module"></script>
    </div>
  );
};

export default PrfPlayground;
