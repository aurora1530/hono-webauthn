import { css } from "hono/css";
import type { FC } from "hono/jsx";
import { useRequestContext } from "hono/jsx-renderer";
import { loginSessionController } from "../../lib/auth/loginSession.js";
import { buttonClass, textMutedClass } from "../../ui/theme.js";

const AuthPage: FC = async () => {
  const c = useRequestContext();
  const userData = await loginSessionController.getUserData(c);

  const titleClass = css`
    font-size: 28px;
    font-weight: 700;
    margin: 16px 0 20px;
    color: var(--text-color);
  `;

  const authLinksClass = css`
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: center;
  `;

  const primary = buttonClass("primary", "md");
  const secondary = buttonClass("secondary", "md");

  return (
    <>
      <h1 class={titleClass}>WebAuthn</h1>
      <div class={authLinksClass}>
        {userData ? (
          <>
            <span class={textMutedClass}>ログイン中:</span> <strong>{userData.username}</strong>
            <button class={secondary} id="add-passkey-button" type="button">
              パスキー作成
            </button>
            <a class={secondary} href="/auth/prf">
              PRF暗号化
            </a>
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
            <a class={primary} href="/auth/register">
              新規登録
            </a>
            <a class={secondary} href="/auth/login">
              ログイン
            </a>
          </>
        )}
      </div>
      <script src="/public/authPage.js" type="module"></script>
    </>
  );
};

export default AuthPage;
