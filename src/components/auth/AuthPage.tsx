import { css, cx } from "hono/css";
import type { FC } from "hono/jsx";
import { useRequestContext } from "hono/jsx-renderer";
import { loginSessionController } from "../../lib/auth/loginSession.js";

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
      background: var(--primary-color);
      color: #fff;
      &:hover {
        background: var(--primary-hover);
      }
      &:active {
        opacity: 0.9;
      }
    `,
  );

  const secondary = cx(
    pillBase,
    css`
      background: #e5e7eb;
      color: var(--text-color);
      &:hover {
        background: #d1d5db;
      }
      &:active {
        opacity: 0.95;
      }
    `,
  );

  return (
    <>
      <h1 class={titleClass}>WebAuthn</h1>
      <div class={authLinksClass}>
        {userData ? (
          <>
            <span style="color:#64748b">ログイン中:</span> <strong>{userData.username}</strong>
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
