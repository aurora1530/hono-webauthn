import { css, cx } from "hono/css";
import type { FC } from "hono/jsx";
import { useRequestContext } from "hono/jsx-renderer";
import { loginSessionController } from "../../lib/auth/loginSession.js";
import { badgeClass, buttonClass, navLinkClass, textMutedClass } from "../../ui/theme.js";

const Header: FC = async () => {
  const c = useRequestContext();
  const userdata = await loginSessionController.getUserData(c);

  const headerClass = css`
    background-color: var(--header-bg);
    padding: 1rem 2rem;
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 1000;
    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.06);
  `;

  const navClass = css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
  `;

  const logoClass = css`
    font-size: 1.3rem;
    font-weight: 800;
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
    gap: 1.25rem;
    align-items: center;
  `;

  const dangerLinkClass = css`
    color: var(--color-danger);
    &:hover {
      color: color-mix(in srgb, var(--color-danger) 85%, black);
    }
  `;

  const registerButtonClass = buttonClass("primary", "sm");

  return (
    <header class={headerClass}>
      <nav class={navClass}>
        <div>
          <a href="/" class={logoClass}>
            Hono WebAuthn Demo App
          </a>
        </div>
        <div class={linkGroupClass}>
          {userdata ? (
            <>
              {userdata.debugMode && <span class={badgeClass("warning")}>デバッグモード</span>}
              <span class={textMutedClass}>{userdata.username}</span>
              <a href="/profile" class={navLinkClass}>
                プロフィール
              </a>
              <a href="/auth/passkey-management" class={navLinkClass}>
                パスキー管理
              </a>
              <a
                href="/auth/logout"
                class={cx(navLinkClass, dangerLinkClass)}
                onclick="return confirm('ログアウトしますか？');"
              >
                ログアウト
              </a>
            </>
          ) : (
            <>
              <a href="/auth/login" class={navLinkClass}>
                ログイン
              </a>
              <a href="/auth/register" class={registerButtonClass}>
                アカウント登録
              </a>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
