import { css, cx } from 'hono/css';
import type { FC } from 'hono/jsx';
import { useRequestContext } from 'hono/jsx-renderer';

const AuthPage: FC = async () => {
  const c = useRequestContext();
  const loginSession = c.get('loginSessionStore');
  const userData = await loginSession.get(c.get('loginSessionID'));

  const titleClass = css`
    font-size: 24px;
    margin: 16px 0 20px;
  `;

  const authLinksClass = css`
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: center;
  `;

  const pillBase = css`
    display: inline-block;
    border-radius: 999px;
    padding: 8px 14px;
    font-size: 14px;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out, opacity 0.15s;
  `;

  const primary = cx(
    pillBase,
    css`
      background: #2563eb;
      color: #fff;
      &:hover {
        background: #1d4ed8;
      }
      &:active {
        opacity: 0.9;
      }
    `
  );

  const secondary = cx(
    pillBase,
    css`
      background: #e5e7eb;
      color: #111827;
      &:hover {
        background: #d1d5db;
      }
      &:active {
        opacity: 0.95;
      }
    `
  );

  return (
    <>
      <h1 class={titleClass}>WebAuthn</h1>
      <div class={authLinksClass}>
        {userData ? (
          <>
            ログイン中: <strong>{userData.username}</strong>
            <button class={secondary} onclick="handleRegistration(false)">パスキー追加</button>
            <a
              class={primary}
              href="/auth/logout"
              onclick={`if (!confirm('ログアウトしますか？')) event.preventDefault();`}
            >
              ログアウト
            </a>
          </>
        ) : (
          <>
            <a class={primary} href="/auth/register">新規登録</a>
            <a class={secondary} href="/auth/login">ログイン</a>
          </>
        )}
      </div>
    </>
  );
};

export default AuthPage;
