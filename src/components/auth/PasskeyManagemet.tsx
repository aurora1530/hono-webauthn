import type { Passkey, PasskeyHistory } from "@prisma/client";
import { css, cx } from "hono/css";
import type { FC } from "hono/jsx";
import { aaguidToNameAndIcon, getIconsByName } from "../../lib/auth/aaguid.js";
import { getPasskeyHistoryTypeLabel } from "../../lib/auth/passkeyHistoryType.js";
import { isSynced } from "../../lib/auth/sync.js";
import { MAX_PASSKEYS_PER_USER } from "../../routes/auth/webauthn/constant.js";
import { badgeClass, buttonClass, surfaceClass, textMutedClass } from "../../ui/theme.js";

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
    display: grid;
    gap: 14px;
  `;

  const titleClass = css`
    font-size: 22px;
    font-weight: 800;
    margin: 8px 0 4px;
  `;

  const listClass = css`
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
  `;

  const itemClass = cx(
    surfaceClass(),
    css`
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 0.6em;
      box-sizing: border-box;
    `,
  );

  const statusRowClass = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 18px;
  `;

  const statusLeftClass = css`
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 18px;
  `;

  const cardHeaderClass = css`
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    column-gap: 14px;
  `;

  const iconWrapperClass = css`
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: var(--color-surface-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border);
  `;

  const cardTitleStackClass = css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  `;

  const nameRowClass = css`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  `;

  const actionGroupClass = css`
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  `;

  const iconButtonBaseClass = css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    background: var(--color-surface-strong);
    color: var(--text-color);
    transition: background-color 0.15s ease-in-out, opacity 0.15s;
    &:hover {
      background: var(--color-surface-muted);
    }
  `;

  const iconButtonDangerClass = css`
    background: var(--color-danger-surface);
    color: #991b1b;
    border-color: color-mix(in srgb, var(--color-danger) 45%, white);
    &:hover {
      background: color-mix(in srgb, var(--color-danger-surface) 70%, white);
    }
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;

  const iconButtonTestClass = css`
    background: #dbeafe;
    color: #1e3a8a;
    border-color: #bfdbfe;
    &:hover {
      background: #bfdbfe;
    }
  `;

  const iconClass = css`
    width: 28px;
    height: 28px;
    object-fit: contain;
  `;

  const nameClass = css`
    font-weight: 700;
    text-align: left;
    font-size: 16px;
    color: var(--text-color);
    margin: 0;
    flex: 1;
    min-width: 0;
  `;

  const currentSessionClass = css`
    font-size: 12px;
    color: var(--primary-color);
    font-weight: 700;
  `;

  const metaClass = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px 18px;
    padding-top: 10px;
    border-top: 1px solid var(--color-border);
  `;

  const metaLabelClass = cx(
    textMutedClass,
    css`
      font-size: 11px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 4px;
      display: block;
    `,
  );

  const metaValueClass = css`
    font-size: 13px;
    color: var(--text-color);
    line-height: 1.4;
  `;

  const badgeGroupClass = css`
    display: inline-flex;
    gap: 8px;
    align-items: center;
  `;

  const addButtonClass = buttonClass("primary", "md");
  const prfLinkButtonClass = css`
    cursor: pointer;
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 13px;
    background: #0f172a;
    color: #fff;
    text-decoration: none;
    &:hover {
      opacity: 0.9;
    }
  `;

  const badgeSyncedClass = cx(
    badgeClass("neutral"),
    css`
      background: #ecfdf5;
      color: #065f46;
      border-color: #a7f3d0;
    `,
  );

  const badgeUnsyncedClass = cx(
    badgeClass("warning"),
    css`
      background: #fffbeb;
      color: #92400e;
      border-color: #fde68a;
    `,
  );

  const badgeEncryptedClass = cx(
    badgeClass("danger"),
    css`
      background: #fee2e2;
      color: #991b1b;
      border-color: #fecaca;
    `,
  );

  const linkRowClass = css`
    display: flex;
    justify-content: flex-end;
    margin: 6px 0 12px;
  `;

  const aaguidDesktopClass = css`
    font-size: 11px;
    color: #94a3b8;
    word-break: break-all;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 260px;
    flex-shrink: 0;
    @media (max-width: 560px) {
      display: none;
    }
  `;

  const aaguidMobileClass = css`
    font-size: 11px;
    color: #94a3b8;
    word-break: break-all;
    display: none;
    @media (max-width: 560px) {
      display: block;
    }
  `;

  const smallMarginClass = css`
    margin: 0.4em 0;
  `;

  const metaItemClass = css`
    display: flex;
    flex-direction: column;
  `;

  const lockMessageClass = css`
    font-size: 12px;
    color: #991b1b;
    margin: 4px 0 0;
    text-align: right;
  `;

  return (
    <div class={containerClass}>
      <h2 class={titleClass}>パスキー管理</h2>
      <div class={css`display:flex; align-items:center; gap:10px; flex-wrap:wrap;`}>
        <button
          class={addButtonClass}
          id="add-passkey-button"
          type="button"
          disabled={passkeyData.length >= MAX_PASSKEYS_PER_USER}
        >
          パスキー作成
        </button>
        <span class={textMutedClass}>
          パスキーの数: {passkeyData.length} / {MAX_PASSKEYS_PER_USER}
        </span>
      </div>
      <div class={linkRowClass}>
        <a class={prfLinkButtonClass} href="/auth/prf">
          PRF暗号化ページを開く
        </a>
      </div>
      {passkeyData.length === 0 ? (
        <p class={textMutedClass}>作成されているパスキーはありません。</p>
      ) : (
        <>
          {passkeyData.every((pData) => !isSynced(pData.passkey)) && (
            <p
              class={cx(
                textMutedClass,
                css`
                  color: #b45309;
                  background: #fef3c7;
                  padding: 10px 12px;
                  border-radius: 10px;
                  border: 1px solid #fcd34d;
                  font-weight: 600;
                `,
              )}
            >
              注意:
              同期されたパスキーがありません。パスキーを紛失した場合、認証できなくなる可能性があります。
            </p>
          )}
          <ul class={listClass}>
            {passkeyData.map((pData) => {
              const browser = pData.passkey.createdBrowser;
              const os = pData.passkey.createdOS;
              const iconSrc =
                aaguidToNameAndIcon(pData.passkey.aaguid)?.icon_light ??
                getIconsByName(pData.passkey.name).icon_light;
              const metaLastUsed = pData.lastUsed
                ? `${pData.lastUsed.usedAt.toLocaleString()} by ${pData.lastUsed.usedBrowser} on ${pData.lastUsed.usedOS} (${getPasskeyHistoryTypeLabel(pData.lastUsed.type)})`
                : "未使用";
              const hasCiphertextLock = pData.prfCiphertextCount > 0;
              return (
                <li key={pData.passkey.id} class={itemClass} data-passkey-id={pData.passkey.id}>
                  <div class={statusRowClass}>
                    <div class={statusLeftClass}>
                      {pData.passkey.id === currentPasskeyID && (
                        <span class={currentSessionClass}>現在のセッションで使用中</span>
                      )}
                    </div>
                    <div class={badgeGroupClass}>
                      {isSynced(pData.passkey) ? (
                        <span class={badgeSyncedClass}>Synced</span>
                      ) : (
                        <span class={badgeUnsyncedClass}>Unsynced</span>
                      )}
                      <span
                        class={badgeEncryptedClass}
                        title="暗号化済みのデータがあります"
                        data-prf-badge=""
                        data-passkey-id={pData.passkey.id}
                        hidden={!hasCiphertextLock}
                      >
                        暗号化済み <span data-prf-badge-count>{pData.prfCiphertextCount}</span>
                      </span>
                    </div>
                  </div>
                  <div class={cardHeaderClass}>
                    <div class={iconWrapperClass}>
                      {iconSrc ? (
                        <img decoding="async" class={iconClass} src={iconSrc} alt="" />
                      ) : (
                        <span style="width:28px;height:28px;display:inline-block;">
                          <span class="material-symbols-outlined">passkey</span>
                        </span>
                      )}
                    </div>

                    <div class={cardTitleStackClass}>
                      <div class={nameRowClass}>
                        <p class={nameClass}>{pData.passkey.name}</p>
                        {debugMode && (
                          <span class={aaguidDesktopClass}>AAGUID: {pData.passkey.aaguid}</span>
                        )}
                      </div>
                    </div>

                    <div class={actionGroupClass}>
                      {
                        /* history icon button */
                        debugMode && (
                          <button
                            id="view-passkey-history-btn"
                            class={cx(iconButtonBaseClass, "view-passkey-history-btn")}
                            aria-label="パスキー利用履歴を見る"
                            title="パスキー利用履歴を見る"
                            data-passkey-id={pData.passkey.id}
                            type="button"
                          >
                            <span class="material-symbols-outlined">history</span>
                          </button>
                        )
                      }

                      {/* Test authentication icon button */}
                      <button
                        class={cx(iconButtonBaseClass, iconButtonTestClass, "test-passkey-btn")}
                        aria-label="このパスキーで認証テスト"
                        title="このパスキーで認証テスト"
                        data-passkey-id={pData.passkey.id}
                        type="button"
                      >
                        <span class="material-symbols-outlined">experiment</span>
                      </button>

                      {/* Edit (change name) icon button */}
                      <button
                        id="change-passkey-name-btn"
                        class={cx(iconButtonBaseClass, "change-passkey-name-btn")}
                        aria-label="パスキー名を変更"
                        title="パスキー名を変更"
                        data-passkey-id={pData.passkey.id}
                        data-passkey-name={pData.passkey.name}
                        type="button"
                      >
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                      {/* Delete icon button */}
                      <button
                        class={cx(iconButtonBaseClass, iconButtonDangerClass, "delete-passkey-btn")}
                        aria-label="パスキーを削除"
                        title="パスキーを削除"
                        data-passkey-id={pData.passkey.id}
                        // 同期されているパスキーがこのパスキーのみかどうかを表すフラグ。
                        data-only-synced-passkey={
                          isSynced(pData.passkey) &&
                          passkeyData.filter((pd) => isSynced(pd.passkey)).length === 1
                            ? "true"
                            : "false"
                        }
                        data-initial-disabled={(
                          !canDelete || pData.passkey.id === currentPasskeyID
                        ).toString()}
                        type="button"
                        disabled={
                          !canDelete || pData.passkey.id === currentPasskeyID || hasCiphertextLock
                        }
                      >
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>

                  <p
                    class={lockMessageClass}
                    data-prf-lock-message=""
                    data-passkey-id={pData.passkey.id}
                    hidden={!hasCiphertextLock}
                  >
                    暗号化されたデータが存在するため、削除できません。
                  </p>

                  {debugMode && (
                    <span class={cx(aaguidMobileClass, smallMarginClass)}>
                      AAGUID: {pData.passkey.aaguid}
                    </span>
                  )}

                  <div class={metaClass}>
                    <div class={metaItemClass}>
                      <span class={metaLabelClass}>作成日時</span>
                      <span class={metaValueClass}>
                        {pData.passkey.createdAt.toLocaleString()} by {browser} on {os}
                      </span>
                    </div>
                    <div class={metaItemClass}>
                      <span class={metaLabelClass}>最終使用日時</span>
                      <span class={metaValueClass}>{metaLastUsed}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <script src="/public/passkeyManagement.js" type="module"></script>
    </div>
  );
};

export default PasskeyManagement;
