import type { Passkey, PasskeyHistory } from "@prisma/client";
import { css, cx } from "hono/css";
import type { FC } from "hono/jsx";
import { aaguidToNameAndIcon, getIconsByName } from "../../lib/auth/aaguid.js";
import { getPasskeyHistoryTypeLabel } from "../../lib/auth/passkeyHistoryType.js";
import { isSynced } from "../../lib/auth/sync.js";
import { formatUtcDateTime } from "../../lib/date.js";
import { MAX_PASSKEYS_PER_USER } from "../../routes/auth/webauthn/constant.js";
import { buttonClass, surfaceClass, textMutedClass } from "../../ui/theme.js";

type PasskeyData = {
  passkey: Passkey;
  lastUsed: PasskeyHistory | undefined;
  prfCiphertextCount: number;
};

const PasskeyManagement: FC<{
  passkeyData: PasskeyData[];
  currentPasskeyID: string;
  debugMode?: boolean;
}> = ({ passkeyData, currentPasskeyID, debugMode = false }) => {
  const canDelete = passkeyData.length > 1;

  const containerClass = css`
    width: min(960px, 100%);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  `;

  const headerClass = css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `;

  const headerTopClass = css`
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 16px;
  `;

  const titleClass = css`
    font-size: 24px;
    font-weight: 800;
    margin: 0;
    line-height: 1.2;
  `;

  const listClass = css`
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  `;

  const itemClass = cx(
    surfaceClass(),
    css`
      padding: 20px;
      display: flex;
      gap: 16px;
      align-items: flex-start;
      @media (max-width: 600px) {
        flex-direction: column;
      }
    `,
  );

  const iconSectionClass = css`
    flex-shrink: 0;
  `;

  const iconWrapperClass = css`
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--color-surface-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border);
    color: var(--text-muted);
  `;

  const iconClass = css`
    width: 32px;
    height: 32px;
    object-fit: contain;
  `;

  const iconToggleLightClass = css`
    display: var(--icon-light-display);
  `;

  const iconToggleDarkClass = css`
    display: var(--icon-dark-display);
  `;

  const contentSectionClass = css`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;

  const nameRowClass = css`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  `;

  const nameClass = css`
    font-weight: 700;
    font-size: 18px;
    color: var(--text-color);
    margin: 0;
  `;

  const badgeRowClass = css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  `;

  const badgeBaseClass = css`
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid transparent;
      line-height: 1.4;
      white-space: nowrap;
      &[hidden] {
        display: none !important;
      }
    `;

  const badgeCurrentClass = css`
    background: var(--color-info-surface);
    color: var(--primary-color);
    border-color: color-mix(in srgb, var(--primary-color) 20%, transparent);
  `;

  const badgeSyncedClass = css`
    background: var(--color-success-surface);
    color: var(--color-success);
    border-color: color-mix(in srgb, var(--color-success) 30%, transparent);
  `;

  const badgeUnsyncedClass = css`
    background: var(--color-warning-surface);
    color: var(--color-warning);
    border-color: color-mix(in srgb, var(--color-warning) 30%, transparent);
  `;

  const badgeEncryptedClass = css`
    background: var(--color-danger-surface);
    color: var(--color-danger);
    border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);
  `;

  const metaSectionClass = css`
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `;

  const metaItemClass = css`
    font-size: 13px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 6px;
    line-height: 1.4;
  `;

  const actionSectionClass = css`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    @media (max-width: 600px) {
      width: 100%;
      justify-content: flex-end;
      border-top: 1px solid var(--color-border);
      padding-top: 12px;
    }
  `;

  const iconButtonBaseClass = css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    background: var(--color-surface-strong);
    color: var(--text-color);
    transition: all 0.2s ease;
    &:hover {
      background: var(--color-surface-muted);
      border-color: var(--color-border-hover);
    }
    &:active {
      transform: translateY(1px);
    }
  `;

  const iconButtonDangerClass = css`
    background: var(--color-danger-surface);
    color: var(--color-danger);
    border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);
    &:hover {
      background: color-mix(in srgb, var(--color-danger-surface) 80%, var(--color-danger));
      border-color: var(--color-danger);
      color: white;
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: var(--color-surface-muted);
      color: var(--text-muted);
      border-color: var(--color-border);
    }
  `;

  const iconButtonTestClass = css`
    background: var(--color-info-surface);
    color: var(--primary-color);
    border-color: color-mix(in srgb, var(--primary-color) 30%, transparent);
    &:hover {
      background: color-mix(in srgb, var(--color-info-surface) 80%, var(--primary-color));
      border-color: var(--primary-color);
      color: white;
    }
  `;

  const addButtonClass = buttonClass("primary", "md");

  const prfLinkButtonClass = css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    text-decoration: none;
    padding: 6px 10px;
    border-radius: 6px;
    &:hover {
      background: var(--color-surface-muted);
      color: var(--text-color);
    }
  `;

  const lockMessageClass = css`
    font-size: 12px;
    color: var(--color-danger);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    line-height: 1.2;
    text-align: left;
    &[hidden] {
      display: none !important;
    }
    @media (max-width: 600px) {
      font-size: 10px;
    }
  `;

  return (
    <div class={containerClass}>
      <header class={headerClass}>
        <div class={headerTopClass}>
          <div>
            <h2 class={titleClass}>パスキー管理</h2>
            <span class={textMutedClass} style="font-size: 13px; margin-top: 4px; display: block;">
              作成済みのパスキー: {passkeyData.length} / {MAX_PASSKEYS_PER_USER}
            </span>
          </div>
          <div class={css`display:flex; align-items:center; gap:12px;`}>
            <a class={prfLinkButtonClass} href="/auth/prf">
              <span class="material-symbols-outlined" style="font-size: 18px;">
                lock
              </span>
              PRF プレイグラウンド
            </a>
            <button
              class={addButtonClass}
              id="add-passkey-button"
              type="button"
              disabled={passkeyData.length >= MAX_PASSKEYS_PER_USER}
            >
              <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">
                add
              </span>
              パスキー作成
            </button>
          </div>
        </div>

        {passkeyData.length === 0 ? (
          <p class={textMutedClass}>作成されているパスキーはありません。</p>
        ) : (
          passkeyData.every((pData) => !isSynced(pData.passkey)) && (
            <div
              class={cx(
                textMutedClass,
                css`
                  color: #92400e;
                  background: #fffbeb;
                  padding: 12px 16px;
                  border-radius: 8px;
                  border: 1px solid #fcd34d;
                  font-size: 14px;
                  display: flex;
                  align-items: flex-start;
                  gap: 10px;
                `,
              )}
            >
              <span class="material-symbols-outlined" style="font-size: 20px; color: #d97706;">
                warning
              </span>
              <span>
                <strong>注意:</strong>{" "}
                同期されたパスキーがありません。デバイスを紛失した場合、アカウントにアクセスできなくなる可能性があります。
              </span>
            </div>
          )
        )}
      </header>

      {passkeyData.length > 0 && (
        <ul class={listClass}>
          {passkeyData.map((pData) => {
            const browser = pData.passkey.createdBrowser;
            const os = pData.passkey.createdOS;
            const metadata = aaguidToNameAndIcon(pData.passkey.aaguid) ?? {
              ...getIconsByName(pData.passkey.name),
              name: undefined,
            };
            const defaultName = metadata?.name ?? "パスキー";
            const iconLight = metadata.icon_light;
            const iconDark = metadata.icon_dark;
            const lastUsedLabel = pData.lastUsed
              ? `${formatUtcDateTime(pData.lastUsed.usedAt, "Asia/Tokyo")} (${getPasskeyHistoryTypeLabel(pData.lastUsed.type)})`
              : "未使用";

            const hasCiphertextLock = pData.prfCiphertextCount > 0;
            const isCurrent = pData.passkey.id === currentPasskeyID;

            return (
              <li key={pData.passkey.id} class={itemClass} data-passkey-id={pData.passkey.id}>
                <div class={iconSectionClass}>
                  <div class={iconWrapperClass}>
                    {iconLight && iconDark ? (
                      <>
                        <img
                          decoding="async"
                          class={cx(iconClass, iconToggleLightClass)}
                          src={iconLight}
                          alt=""
                        />
                        <img
                          decoding="async"
                          class={cx(iconClass, iconToggleDarkClass)}
                          src={iconDark}
                          alt=""
                        />
                      </>
                    ) : iconLight || iconDark ? (
                      <img decoding="async" class={iconClass} src={iconLight ?? iconDark} alt="" />
                    ) : (
                      <span class="material-symbols-outlined" style="font-size: 28px;">
                        passkey
                      </span>
                    )}
                  </div>
                </div>

                <div class={contentSectionClass}>
                  <div class={nameRowClass}>
                    <p class={nameClass} data-passkey-name-label>
                      {pData.passkey.name}
                    </p>
                  </div>

                  <div class={badgeRowClass}>
                    {isSynced(pData.passkey) ? (
                      <span class={cx(badgeBaseClass, badgeSyncedClass)}>
                        <span
                          class="material-symbols-outlined"
                          style="font-size: 14px; margin-right: 2px;"
                        >
                          cloud_done
                        </span>
                        Synced
                      </span>
                    ) : (
                      <span class={cx(badgeBaseClass, badgeUnsyncedClass)}>
                        <span
                          class="material-symbols-outlined"
                          style="font-size: 14px; margin-right: 2px;"
                        >
                          cloud_off
                        </span>
                        Unsynced
                      </span>
                    )}
                    {hasCiphertextLock && (
                      <span
                        class={cx(badgeBaseClass, badgeEncryptedClass)}
                        title="暗号化済みのデータがあります"
                        data-prf-badge=""
                        data-passkey-id={pData.passkey.id}
                      >
                        <span
                          class="material-symbols-outlined"
                          style="font-size: 14px; margin-right: 2px;"
                        >
                          lock
                        </span>
                        暗号化済み{" "}
                        <span data-prf-badge-count style="margin-left: 2px;">
                          {pData.prfCiphertextCount}
                        </span>
                      </span>
                    )}
                    {isCurrent && (
                      <span class={cx(badgeBaseClass, badgeCurrentClass)}>現在のセッション</span>
                    )}
                  </div>

                  <div class={metaSectionClass}>
                    <div class={metaItemClass}>
                      <span class="material-symbols-outlined" style="font-size: 16px;">
                        calendar_today
                      </span>
                      <span>
                        作成日: {formatUtcDateTime(pData.passkey.createdAt, "Asia/Tokyo")}{" "}
                        <span style="opacity: 0.7;">
                          by {browser} on {os}
                        </span>
                      </span>
                    </div>
                    <div class={metaItemClass}>
                      <span class="material-symbols-outlined" style="font-size: 16px;">
                        history
                      </span>
                      <span>最終利用: {lastUsedLabel}</span>
                    </div>
                    {debugMode && (
                      <>
                        <div class={metaItemClass} style="font-family: monospace; font-size: 11px;">
                          AAGUID: {pData.passkey.aaguid}
                        </div>
                        <div class={metaItemClass} style="font-family: monospace; font-size: 11px;">
                          Counter: {pData.passkey.counter}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div class={actionSectionClass}>
                  <div
                    class={lockMessageClass}
                    data-prf-lock-message=""
                    data-passkey-id={pData.passkey.id}
                    hidden={!hasCiphertextLock}
                  >
                    <span class="material-symbols-outlined" style="font-size: 14px;">
                      lock
                    </span>
                    暗号化データが存在するため削除不可
                  </div>

                  <button
                    id="view-passkey-history-btn"
                    class={cx(iconButtonBaseClass, "view-passkey-history-btn")}
                    aria-label="履歴"
                    title="履歴"
                    data-passkey-id={pData.passkey.id}
                    type="button"
                  >
                    <span class="material-symbols-outlined">history</span>
                  </button>

                  <button
                    class={cx(iconButtonBaseClass, iconButtonTestClass, "test-passkey-btn")}
                    aria-label="認証テスト"
                    title="認証テスト"
                    data-passkey-id={pData.passkey.id}
                    type="button"
                  >
                    <span class="material-symbols-outlined">experiment</span>
                  </button>

                  <button
                    id="change-passkey-name-btn"
                    class={cx(iconButtonBaseClass, "change-passkey-name-btn")}
                    aria-label="名前変更"
                    title="名前変更"
                    data-passkey-id={pData.passkey.id}
                    data-passkey-name={pData.passkey.name}
                    data-passkey-default-name={defaultName}
                    type="button"
                  >
                    <span class="material-symbols-outlined">edit</span>
                  </button>

                  <button
                    class={cx(iconButtonBaseClass, iconButtonDangerClass, "delete-passkey-btn")}
                    aria-label="削除"
                    title="削除"
                    data-passkey-id={pData.passkey.id}
                    data-only-synced-passkey={
                      isSynced(pData.passkey) &&
                      passkeyData.filter((pd) => isSynced(pd.passkey)).length === 1
                        ? "true"
                        : "false"
                    }
                    data-initial-disabled={(!canDelete || isCurrent).toString()}
                    type="button"
                    disabled={!canDelete || isCurrent || hasCiphertextLock}
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <script src="/public/passkeyManagement.js" type="module"></script>
    </div>
  );
};

export default PasskeyManagement;
