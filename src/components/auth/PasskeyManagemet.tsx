import type { Passkey } from '@prisma/client';
import type { FC } from 'hono/jsx';
import { css, cx } from 'hono/css';
import parseUserAgent from '../../lib/auth/useragent.js';
import { aaguidToNameAndIcon } from '../../lib/auth/aaguid/parse.js';

const PasskeyManagement: FC<{ passkeys: Passkey[] }> = ({ passkeys }) => {
  const canDelete = passkeys.length > 1;

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
  `;

  const itemClass = css`
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
  `;

  const rowTopClass = css`
    display: grid;
    grid-template-columns: 24px 1fr 24px;
    align-items: center;
    column-gap: 8px;
  `;

  const rowActionsClass = css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    justify-items: center;
    align-items: center;
    width: 100%;
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

  const metaClass = css`
    font-size: 12px;
    color: #6b7280;
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

  const subtleButtonClass = cx(
    buttonBaseClass,
    css`
      background: #f3f4f6;
      color: #111827;
      &:hover {
        background: #e5e7eb;
      }
    `
  );

  const dangerButtonClass = cx(
    buttonBaseClass,
    css`
      background: #ef4444;
      color: #fff;
      &:hover {
        background: #dc2626;
      }
      &:disabled {
        background: #fca5a5;
        cursor: not-allowed;
        opacity: 0.8;
      }
    `
  );

  const addButtonClass = cx(
    buttonBaseClass,
    css`
      background: #2563eb;
      color: #fff;
      &:hover {
        background: #1d4ed8;
      }
      margin-top: 12px;
    `
  );

  return (
    <div>
      <h2 class={titleClass}>パスキー管理</h2>
      {passkeys.length === 0 ? (
        <p>登録されているパスキーはありません。</p>
      ) : (
        <ul class={listClass}>
          {passkeys.map((passkey) => {
            const { browser, os } = parseUserAgent(passkey.userAgent);
            const iconSrc = aaguidToNameAndIcon(passkey.aaguid)?.icon_light;
            return (
              <li key={passkey.id} class={itemClass}>
                {passkey.backedUp ? (
                  <span class={badgeSyncedClass}>Synced</span>
                ) : (
                  <span class={badgeUnsyncedClass}>Unsynced</span>
                )}
                <div class={rowTopClass}>
                  {iconSrc ? (
                    <img decoding="async" class={iconClass} src={iconSrc} alt="" />
                  ) : (
                    <span aria-hidden="true"></span>
                  )}
                  <p class={nameClass}>{passkey.name}</p>
                  <span aria-hidden="true"></span>
                </div>

                <div class={rowActionsClass}>
                  <button
                    id="change-passkey-name-btn"
                    class={subtleButtonClass}
                    onclick={`handleChangePasskeyName("${passkey.id}", "${passkey.name}");`}
                  >
                    変更
                  </button>
                  <button
                    class={dangerButtonClass}
                    onclick={`handleDeletePasskey("${passkey.id}");`}
                    disabled={!canDelete}
                  >
                    削除
                  </button>
                </div>

                <p class={metaClass}>
                  登録日時: {passkey.createdAt.toLocaleString()} by {browser} on {os}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <button class={addButtonClass} onclick="handleRegistration(false)">
        パスキー追加
      </button>
      <script src="/public/changePasskeyName.ts"></script>
      <script src="/public/deletePasskey.ts"></script>
    </div>
  );
};

export default PasskeyManagement;
