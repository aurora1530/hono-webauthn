import { css, cx } from "hono/css";
import type { FC } from "hono/jsx";
import { useRequestContext } from "hono/jsx-renderer";
import { loginSessionController } from "../../lib/auth/loginSession.js";
import { badgeClass, buttonClass, textMutedClass } from "../../ui/theme.js";

const Header: FC = async () => {
  const c = useRequestContext();
  const userdata = await loginSessionController.getUserData(c);

  const headerClass = css`
    background-color: var(--header-bg);
    padding: 0.9rem 1.4rem;
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 1000;
    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.06);

    @media (max-width: 640px) {
      padding: 0.8rem 1rem;
    }
  `;

  const navClass = css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    gap: 12px;
    width: 100%;
  `;

  const logoClass = css`
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--text-color);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;

    &:hover {
      color: var(--primary-color);
    }
  `;

  const rightAreaClass = css`
    display: flex;
    align-items: center;
    gap: 0.75rem;
  `;

  const usernameInlineClass = css`
    font-weight: 700;
    color: var(--color-text);
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @media (max-width: 480px) {
      max-width: 120px;
      font-size: 0.95rem;
    }

    @media (max-width: 640px) {
      display: none;
    }
  `;

  const menuRootClass = css`
    position: relative;

    summary {
      list-style: none;
    }

    summary::-webkit-details-marker {
      display: none;
    }
  `;

  const menuTriggerClass = css`
    border: 1px solid var(--color-border);
    background: var(--color-surface-muted);
    border-radius: var(--radius-md);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 10px;
    cursor: pointer;
    color: var(--color-text);
    transition: background-color 0.18s ease, border-color 0.18s ease, transform 0.08s ease,
      box-shadow 0.2s ease;

    &:hover {
      background: color-mix(in srgb, var(--color-surface-muted) 75%, white);
      border-color: var(--color-border-strong);
    }

    &:active {
      transform: translateY(1px);
    }

    &:focus-visible {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
    }
  `;

  const menuPanelClass = css`
    position: absolute;
    right: 0;
    top: calc(100% + 10px);
    min-width: 240px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm);
    border-radius: var(--radius-lg);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 1100;

    @media (max-width: 480px) {
      min-width: 210px;
    }
  `;

  const menuMetaRowClass = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px;
    border-radius: var(--radius-md);
    background: var(--color-surface);
  `;

  const usernameMenuClass = css`
    font-weight: 700;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  const menuLinkClass = css`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    text-decoration: none;
    color: var(--color-text);
    font-weight: 650;
    background: var(--color-surface);
    transition: background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease;

    &:hover {
      background: var(--color-surface-muted);
      border-color: var(--color-border-strong);
      color: var(--primary-color);
    }
  `;

  const dangerLinkClass = css`
    color: var(--color-danger);
    border-color: color-mix(in srgb, var(--color-danger) 45%, var(--color-border));

    &:hover {
      color: color-mix(in srgb, var(--color-danger) 85%, black);
      background: var(--color-danger-surface);
      border-color: color-mix(in srgb, var(--color-danger) 65%, var(--color-border));
    }
  `;

  const debugRowClass = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    background: var(--color-surface);
  `;

  const registerButtonClass = buttonClass("primary", "sm");

  const registerMenuButtonClass = cx(
    registerButtonClass,
    css`
      max-width: 100%;
      justify-content: center;
    `,
  );

  return (
    <header class={headerClass}>
      <nav class={navClass}>
        <a href="/" class={logoClass}>
          Hono WebAuthn Demo App
        </a>

        <div class={rightAreaClass}>
          {userdata && (
            <span class={cx(textMutedClass, usernameInlineClass)}>{userdata.username}</span>
          )}

          <details class={menuRootClass}>
            <summary class={menuTriggerClass} aria-label="メニュー">
              <span class="material-symbols-outlined">menu</span>
            </summary>

            <div class={menuPanelClass}>
              {userdata ? (
                <>
                  <div class={menuMetaRowClass}>
                    <span class={textMutedClass}>ユーザー</span>
                    <span class={usernameMenuClass}>{userdata.username}</span>
                  </div>

                  <div class={debugRowClass}>
                    <span class={textMutedClass}>デバッグモード</span>
                    <span class={badgeClass(userdata.debugMode ? "warning" : "neutral")}>
                      {userdata.debugMode ? "ON" : "OFF"}
                    </span>
                  </div>

                  <a href="/profile" class={menuLinkClass}>
                    プロフィール
                  </a>
                  <a href="/auth/passkey-management" class={menuLinkClass}>
                    パスキー管理
                  </a>
                  <a href="/auth/prf" class={menuLinkClass}>
                    PRFプレイグラウンド
                  </a>
                  <a
                    href="/auth/logout"
                    class={cx(menuLinkClass, dangerLinkClass)}
                    onclick="return confirm('ログアウトしますか？');"
                  >
                    ログアウト
                  </a>
                </>
              ) : (
                <>
                  <a href="/auth/login" class={menuLinkClass}>
                    ログイン
                  </a>
                  <a href="/auth/register" class={registerMenuButtonClass}>
                    アカウント登録
                  </a>
                </>
              )}
            </div>
          </details>
        </div>
      </nav>
    </header>
  );
};

export default Header;
