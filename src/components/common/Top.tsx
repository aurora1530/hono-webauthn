import type { FC } from 'hono/jsx';
import { css, cx } from 'hono/css';
import { useRequestContext } from 'hono/jsx-renderer';
import { loginSessionController } from '../../lib/auth/loginSession.ts';

const Top: FC = async () => {
  const c = useRequestContext();
  const username = (await loginSessionController.getUserData(c))?.username;

  const wrap = css`
    display: grid;
    place-items: center;
    padding: 3rem 0;
  `;

  const hero = css`
    text-align: center;
    display: grid;
    gap: 1rem;
  `;

  const title = css`
    font-size: 2rem;
    font-weight: 800;
    color: var(--text-color);
  `;

  const subtitle = css`
    color: #64748b;
    font-size: 1rem;
  `;

  const actions = css`
    display: inline-flex;
    gap: 0.75rem;
    align-items: center;
    justify-content: center;
    margin-top: 0.5rem;
  `;

  const btnBase = css`
    display: inline-block;
    border-radius: 0.375rem;
    padding: 0.625rem 1rem;
    font-size: 0.95rem;
    text-decoration: none;
    font-weight: 500;
    transition: background-color 0.15s ease-in-out, opacity 0.15s;
  `;

  const primary = cx(
    btnBase,
    css`
      background: var(--primary-color);
      color: #fff;
      &:hover { background: var(--primary-hover); }
      &:active { opacity: 0.95; }
    `
  );

  const secondary = cx(
    btnBase,
    css`
      background: #e2e8f0;
      color: var(--text-color);
      &:hover { background: #cbd5e1; }
      &:active { opacity: 0.95; }
    `
  );

  return (
    <div class={wrap}>
      <div class={hero}>
        <h1 class={title}>Hono WebAuthn</h1>
        {username ? (
          <>
            <p class={subtitle}>ようこそ、{username}さん。</p>
            <div class={actions}>
              <a class={secondary} href="/profile">プロフィール</a>
              <a class={primary} href="/auth/passkey-management">パスキー管理</a>
            </div>
          </>
        ) : (
          <>
            <p class={subtitle}>パスキー対応のデモアプリ。数クリックで安全に認証。</p>
            <div class={actions}>
              <a class={primary} href="/auth/register">新規登録</a>
              <a class={secondary} href="/auth/login">ログイン</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Top;
