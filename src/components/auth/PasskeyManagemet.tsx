import type { Passkey } from '@prisma/client';
import type { FC } from 'hono/jsx';
import { css, cx } from 'hono/css';
import parseUserAgent from '../../lib/auth/useragent.js';
import { aaguidToNameAndIcon } from '../../lib/auth/aaguid/parse.js';

const PasskeyManagement: FC<{ passkeys: Passkey[] }> = ({ passkeys }) => {
  const canDelete = passkeys.length > 1;

  const title = css`
    font-size: 20px;
    font-weight: 600;
    margin: 12px 0 16px;
  `;

  const list = css`
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `;

  const item = css`
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;

  const rowTop = css`
    display: grid;
    grid-template-columns: 24px 1fr 24px;
    align-items: center;
    column-gap: 8px;
  `;

  const rowActions = css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    justify-items: center;
    align-items: center;
    width: 100%;
  `;

  const icon = css`
    width: 20px;
    height: 20px;
    object-fit: contain;
  `;

  const name = css`
    font-weight: 600;
    text-align: center;
  `;

  const meta = css`
    font-size: 12px;
    color: #6b7280;
    margin-top: 4px;
  `;

  const buttonBase = css`
    cursor: pointer;
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 13px;
    transition: background-color 0.15s ease-in-out, opacity 0.15s;
  `;

  const subtleButton = cx(
    buttonBase,
    css`
      background: #f3f4f6;
      color: #111827;
      &:hover {
        background: #e5e7eb;
      }
    `
  );

  const dangerButton = cx(
    buttonBase,
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

  const addButton = cx(
    buttonBase,
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
      <h2 class={title}>パスキー管理</h2>
      {passkeys.length === 0 ? (
        <p>登録されているパスキーはありません。</p>
      ) : (
        <ul class={list}>
          {passkeys.map((passkey) => {
            const { browser, os } = parseUserAgent(passkey.userAgent);
            const icon = aaguidToNameAndIcon(passkey.aaguid)?.icon_light;
            return (
              <li key={passkey.id} class={item}>
                <div class={rowTop}>
                  {icon ? (
                    <img decoding="async" class={icon} src={icon} />
                  ) : (
                    <span aria-hidden="true"></span>
                  )}
                  <p class={name}>{passkey.name}</p>
                  <span aria-hidden="true"></span>
                </div>

                <div class={rowActions}>
                  <button
                    id="change-passkey-name-btn"
                    class={subtleButton}
                    onclick={`handleChangePasskeyName("${passkey.id}")`}
                  >
                    変更
                  </button>
                  <button
                    class={dangerButton}
                    onclick={`handleDeletePasskey("${passkey.id}");`}
                    disabled={!canDelete}
                  >
                    削除
                  </button>
                </div>

                <p class={meta}>
                  登録日時: {passkey.createdAt.toLocaleString()} by {browser} on {os}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <button class={addButton} onclick="handleRegistration(false)">
        パスキー追加
      </button>
      <script src="/public/changePasskeyName.ts"></script>
      <script src="/public/deletePasskey.ts"></script>
    </div>
  );
};

export default PasskeyManagement;
