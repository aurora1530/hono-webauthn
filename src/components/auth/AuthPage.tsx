import { css } from 'hono/css';
import type { FC } from 'hono/jsx';
import { useRequestContext } from 'hono/jsx-renderer';

const AuthPage: FC = () => {
  const loginSession = useRequestContext().get('loginSession');

  const authLinksClass = css`
    display: flex;
    gap: 15px;
    align-items: center;
  `;

  return (
    <>
      <h1>WebAuthn</h1>
      <div class={authLinksClass}>
        {loginSession.isLogin ? (
          <>
            ログイン中: <strong>{loginSession.username}</strong>
            <button onclick="handleRegistration(false)">パスキー追加</button>
            <a
              href="/auth/logout"
              onclick={`if (!confirm('ログアウトしますか？')) event.preventDefault();`}
            >
              ログアウト
            </a>
          </>
        ) : (
          <>
            <a href="/auth/register">新規登録</a>
            <a href="/auth/login">ログイン</a>
          </>
        )}
      </div>
    </>
  );
};

export default AuthPage;
