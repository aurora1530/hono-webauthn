import { css, cx } from "hono/css";
import type { FC } from "hono/jsx";
import { useRequestContext } from "hono/jsx-renderer";
import { loginSessionController } from "../../lib/auth/loginSession.js";
import { buttonClass, textMutedClass } from "../../ui/theme.js";

const Top: FC = async () => {
  const c = useRequestContext();
  const loginState = await loginSessionController.getLoginState(c);
  const username = loginState.state === "LOGGED_IN" ? loginState.userData.username : undefined;

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
    color: var(--color-text-subtle);
    font-size: 1rem;
  `;

  const actions = css`
    display: inline-flex;
    gap: 0.75rem;
    align-items: center;
    justify-content: center;
    margin-top: 0.5rem;
  `;

  const primary = buttonClass("primary", "md");
  const secondary = buttonClass("secondary", "md");

  return (
    <div class={wrap}>
      <div class={hero}>
        <h1 class={title}>Passkey Demo App</h1>
        {username ? (
          <>
            <p class={cx(subtitle, textMutedClass)}>ようこそ、{username}さん。</p>
            <div class={actions}>
              <a class={secondary} href="/profile">
                プロフィール
              </a>
              <a class={primary} href="/auth/passkey-management">
                パスキー管理
              </a>
            </div>
          </>
        ) : (
          <>
            <p class={cx(subtitle, textMutedClass)}>
              パスキー対応のデモアプリ。数クリックで安全に認証。 PRF
              拡張を利用したデータの暗号化プレイグラウンドも提供。
            </p>
            <div class={actions}>
              <a class={primary} href="/auth/register">
                新規登録
              </a>
              <a class={secondary} href="/auth/login">
                ログイン
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Top;
