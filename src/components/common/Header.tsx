import { css, cx } from 'hono/css';
import type { FC } from 'hono/jsx';
import { useRequestContext } from 'hono/jsx-renderer';
import { loginSessionController } from '../../lib/auth/loginSession.js';

const Header: FC = async () => {
  const c = useRequestContext();
  const username = (await loginSessionController.getUserData(c))?.username;

  const headerClass = css`
    background-color: var(--header-bg);
    padding: 1rem 2rem;
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 1000;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  `;

  const navClass = css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
  `;

  const logoClass = css`
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-color);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &:hover {
      color: var(--primary-color);
    }
  `;

  const linkGroupClass = css`
    display: flex;
    gap: 1.5rem;
    align-items: center;
  `;

  const linkClass = css`
    text-decoration: none;
    color: var(--text-color);
    font-weight: 500;
    font-size: 0.95rem;
    transition: color 0.2s;

    &:hover {
      color: var(--primary-color);
    }
  `;

  const logoutBtnClass = css`
    color: #ef4444;
    &:hover {
      color: #dc2626;
    }
  `;

  return (
    <header class={headerClass}>
      <nav class={navClass}>
        <div>
          <a href="/" class={logoClass}>
            Hono WebAuthn
          </a>
        </div>
        <div class={linkGroupClass}>
          {username ? (
            <>
              <span style="color: #64748b; font-size: 0.9rem;">{username}</span>
              <a href="/profile" class={linkClass}>プロフィール</a>
              <a href="/auth/passkey-management" class={linkClass}>パスキー管理</a>
              <a href="/auth/logout" class={cx(linkClass, logoutBtnClass)} onclick="return confirm('ログアウトしますか？')">ログアウト</a>
            </>
          ) : (
            <>
              <a href="/auth/login" class={linkClass}>ログイン</a>
              <a href="/auth/register" class={css`
                background-color: var(--primary-color);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 0.375rem;
                text-decoration: none;
                font-weight: 500;
                transition: background-color 0.2s;
                &:hover {
                  background-color: var(--primary-hover);
                  color: white;
                }
              `}>アカウント登録</a>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
