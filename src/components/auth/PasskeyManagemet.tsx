import type { Passkey, PasskeyHistory } from '@prisma/client';
import type { FC } from 'hono/jsx';
import { css, cx } from 'hono/css';
import { aaguidToNameAndIcon, getIconsByName } from '../../lib/auth/aaguid/parse.js';
import { MAX_PASSKEYS_PER_USER } from '../../routes/auth/webauthn/constant.ts';
import { isSynced } from '../../lib/auth/sync.ts';

type PasskeyData = {
  passkey: Passkey;
  lastUsed: PasskeyHistory | undefined;
}

const PasskeyManagement: FC<{
  passkeyData: PasskeyData[];
  currentPasskeyID: string;
  debugMode?: boolean;
}> = ({ passkeyData, currentPasskeyID, debugMode = false }) => {
  const canDelete = passkeyData.length > 1;

  const containerClass = css`
    width: 100%;
    max-width: 80%;
    margin: 0 auto;
    @media (max-width: 640px) {
      max-width: 100%;
      width: auto;
      margin: 0 8px;
    }
  `;

  const titleClass = css`
    font-size: 20px;
    font-weight: 600;
    margin: 12px 0 16px;
  `;

  const listClass = css`
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
    width: 100%;
  `;

  const itemClass = css`
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    box-sizing: border-box;

    width: 30em;
    @media (max-width: 640px) {
      width: 100%;
    }
  `;

  const rowTopClass = css`
    display: grid;
    grid-template-columns: 1fr auto 1fr; /* left group | name | right group */
    align-items: center;
    column-gap: 8px;
    margin-top: 8px;
  `;

  const rowLeftClass = css`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 20px;
  `;

  const rowRightClass = css`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  `;

  const iconButtonBaseClass = css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    background: #f1f5f9;
    color: var(--text-color);
    transition: background-color 0.15s ease-in-out, opacity 0.15s;
    &:hover { background: #e2e8f0; }
  `;

  const iconButtonDangerClass = css`
    background: #fee2e2; /* red-100 */
    color: #991b1b; /* red-800 */
    &:hover { background: #fecaca; }
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;

  const iconButtonTestClass = css`
    background: #dbeafe; /* blue-100 */
    color: #1e3a8a; /* blue-800 */
    &:hover { background: #bfdbfe; }
  `;

  const iconSvgClass = css`
    width: 18px;
    height: 18px;
    display: block;
  `;

  const iconClass = css`
    width: 20px;
    height: 20px;
    object-fit: contain;
  `;

  const nameClass = css`
    font-weight: 600;
    text-align: center;
  `;

  const currentSessionClass = css`
    font-size: 12px;
    color: var(--primary-color);
    margin-top: -4px;
    text-align: center;
  `;

  const metaClass = css`
    font-size: 12px;
    color: #64748b;
    margin-top: 4px;
  `;

  const badgeSyncedClass = css`
    position: absolute;
    top: 8px;
    right: 8px;
    background: #ecfdf5; /* green-50 */
    color: #065f46; /* green-800 */
    border: 1px solid #a7f3d0; /* green-200 */
    border-radius: 9999px; /* pill */
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.4;
  `;

  const badgeUnsyncedClass = css`
    position: absolute;
    top: 8px;
    right: 8px;
    background: #fffbeb; /* amber-50 */
    color: #92400e; /* amber-800 */
    border: 1px solid #fde68a; /* amber-300 */
    border-radius: 9999px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.4;
  `;

  const buttonBaseClass = css`
    cursor: pointer;
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 13px;
    transition: background-color 0.15s ease-in-out, opacity 0.15s;
  `;

  const addButtonClass = cx(
    buttonBaseClass,
    css`
      background: var(--primary-color);
      color: #fff;
      &:hover {
        background: var(--primary-hover);
      }
      margin: 6px;
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `
  );

  const aaguidClass = css`
    font-size: 12px;
    color: #94a3b8;
    word-break: break-all;
  `;

  return (
    <div class={containerClass}>
      <h2 class={titleClass}>パスキー管理</h2>
      <button class={addButtonClass} id="add-passkey-button" disabled={passkeyData.length >= MAX_PASSKEYS_PER_USER}>
        パスキー作成
      </button>
      <hr />
      <p>パスキーの数: {passkeyData.length} / {MAX_PASSKEYS_PER_USER}</p>
      {passkeyData.length === 0 ? (
        <p>作成されているパスキーはありません。</p>
      ) : (
       <>
          {passkeyData.every(pData =>  !isSynced(pData.passkey)) && (
            <p style="color: #b45309; background: #fef3c7; padding: 8px 12px; border-radius: 6px; border: 1px solid #fcd34d;">
              注意: 同期されたパスキーがありません。パスキーを紛失した場合、認証できなくなる可能性があります。
            </p>
          )}
          <ul class={listClass}>
            {passkeyData.map((pData) => {
              const browser = pData.passkey.createdBrowser;
              const os = pData.passkey.createdOS;
              const iconSrc =
                aaguidToNameAndIcon(pData.passkey.aaguid)?.icon_light ??
                getIconsByName(pData.passkey.name).icon_light;
              return (
                  <li key={pData.passkey.id} class={itemClass}>
                    {isSynced(pData.passkey) ? (
                    <span class={badgeSyncedClass}>Synced</span>
                  ) : (
                    <span class={badgeUnsyncedClass}>Unsynced</span>
                  )}
                  <div class={rowTopClass}>
                    <div class={rowLeftClass}>
                      {iconSrc ? (
                        <img decoding="async" class={iconClass} src={iconSrc} alt="" />
                      ) : (
                        <span
                          aria-hidden="true"
                          style="width:20px;height:20px;display:inline-block;"
                        ></span>
                      )}
                    </div>
                    <p class={nameClass}>{pData.passkey.name}</p>
                    <div class={rowRightClass}>
                      {
                        /* history icon button */
                        debugMode && (
                          <button
                            id="view-passkey-history-btn"
                            class={cx(iconButtonBaseClass, 'view-passkey-history-btn')}
                            aria-label="パスキー利用履歴を見る"
                            title="パスキー利用履歴を見る"
                            data-passkey-id={pData.passkey.id}
                          >
                            {/* History icon */}
                            <svg
                              class={iconSvgClass}
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M12 8v4l3 3m5-1.5a9 9 0 1 1-4.5-7.73M12 3v3m0 0H9m3 0h3"
                                stroke="currentColor"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                              />
                            </svg>
                          </button>
                        )
                      }

                      {/* Test authentication icon button */}
                      <button
                        class={cx(iconButtonBaseClass, iconButtonTestClass, 'test-passkey-btn')}
                        aria-label="このパスキーで認証テスト"
                        title="このパスキーで認証テスト"
                        data-passkey-id={pData.passkey.id}
                      >
                        {/* Beaker icon */}
                        <svg
                          class={iconSvgClass}
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M9.75 3 9 4.5v5.379a5.995 5.995 0 0 0-1.56 1.233 6.002 6.002 0 0 0 4.35 10.388h.42a6.002 6.002 0 0 0 4.35-10.388 5.995 5.995 0 0 0-1.56-1.233V4.5L14.25 3m-4.5 0h4.5"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M9 13.5h6"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linecap="round"
                          />
                        </svg>
                      </button>

                      {/* Edit (change name) icon button */}
                      <button
                        id="change-passkey-name-btn"
                        class={cx(iconButtonBaseClass, 'change-passkey-name-btn')}
                        aria-label="パスキー名を変更"
                        title="パスキー名を変更"
                        data-passkey-id={pData.passkey.id}
                        data-passkey-name={pData.passkey.name}
                      >
                        {/* Pencil icon */}
                        <svg
                          class={iconSvgClass}
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M15.232 5.232a2.5 2.5 0 0 1 3.536 3.536L9.5 18.036 5 19l.964-4.5 9.268-9.268Z"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </button>
                      {/* Delete icon button */}
                      <button
                        class={cx(
                          iconButtonBaseClass,
                          iconButtonDangerClass,
                          'delete-passkey-btn'
                        )}
                        aria-label="パスキーを削除"
                        title="パスキーを削除"
                        data-passkey-id={pData.passkey.id}
                        // 同期されているパスキーがこのパスキーのみかどうかを表すフラグ。
                        data-only-synced-passkey={
                          isSynced(pData.passkey) &&
                          passkeyData.filter((pd) => isSynced(pd.passkey)).length === 1
                            ? 'true'
                            : 'false'
                        }
                        disabled={!canDelete || pData.passkey.id === currentPasskeyID}
                      >
                        {/* Trash icon */}
                        <svg
                          class={iconSvgClass}
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M9 11v6m6-6v6M4 7h16M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1Zm9 3-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {pData.passkey.id === currentPasskeyID && (
                    <p class={currentSessionClass}>現在のセッションで使用中</p>
                  )}

                  {debugMode && (<span class={aaguidClass}>AAGUID: {pData.passkey.aaguid}</span>)}

                  <div class={metaClass}>
                    <p>
                      作成日時: {pData.passkey.createdAt.toLocaleString()} by {browser} on{' '}
                      {os}
                    </p>
                    <p>
                      最終使用日時:{' '}
                      {pData.lastUsed
                        ? pData.lastUsed.usedAt.toLocaleString() +
                          ` by ${pData.lastUsed.usedBrowser} on ${pData.lastUsed.usedOS}`
                        : '未使用'}
                    </p>
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
