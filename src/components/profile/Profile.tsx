import { css, cx } from "hono/css";
import type { FC } from "hono/jsx";
import { useRequestContext } from "hono/jsx-renderer";
import { loginSessionController } from "../../lib/auth/loginSession.js";

const Profile: FC = async () => {
  const c = useRequestContext();
  const userData = await loginSessionController.getUserData(c);

  if (!userData) {
    const backLinkClass = css`
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 600;
      &:hover {
        text-decoration: underline;
      }
    `;
    return (
      <div>
        <h1>プロフィール</h1>
        <p>ログインしてください。</p>
        <a href="/auth/login" class={backLinkClass}>
          ログインページへ
        </a>
      </div>
    );
  }

  const pageClass = css`
    display: grid;
    gap: 20px;
    max-width: 820px;
  `;

  const headingClass = css`
    font-size: 26px;
    font-weight: 800;
    margin-bottom: 4px;
  `;

  const subHeadingClass = css`
    color: #475569;
    margin: 0 0 16px;
  `;

  const cardClass = css`
    background: var(--header-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 18px 20px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
  `;

  const sectionTitleClass = css`
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 8px;
  `;

  const mutedTextClass = css`
    color: #64748b;
    margin: 0 0 12px;
  `;

  const checkboxWrapClass = css`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  `;

  const dangerCardClass = cx(
    cardClass,
    css`
      border-color: #fecdd3;
      background: linear-gradient(135deg, #fff1f2, #fff5f7);
    `,
  );

  const badgeClass = css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 999px;
    background: #e2e8f0;
    color: #0f172a;
    font-weight: 600;
    font-size: 14px;
  `;

  const dangerBtnClass = css`
    background: #ef4444;
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 10px 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.1s ease;
    width: fit-content;
    &:hover {
      background: #dc2626;
    }
    &:active {
      transform: translateY(1px);
    }
  `;

  const infoListClass = css`
    list-style: none;
    padding: 0;
    margin: 8px 0 14px;
    display: grid;
    gap: 6px;
  `;

  return (
    <div class={pageClass}>
      <header>
        <h1 class={headingClass}>プロフィール</h1>
        <p class={subHeadingClass}>こんにちは、{userData.username} さん</p>
      </header>

      <section class={cardClass}>
        <h2 class={sectionTitleClass}>デバッグモード</h2>
        <p class={mutedTextClass}>
          ログの詳細を確認するための内部モードです。必要な場合のみオンにしてください。
        </p>
        <label class={checkboxWrapClass}>
          <input type="checkbox" checked={!!userData.debugMode} id="change-debug-mode-btn" />
          デバッグモードを有効にする
        </label>
      </section>

      <section class={dangerCardClass}>
        <h2 class={sectionTitleClass}>アカウント削除</h2>
        <p class={mutedTextClass}>
          この操作は取り消せません。すべてのパスキー、履歴、暗号データを削除します。
        </p>
        <div class={badgeClass}>Danger zone</div>
        <ul class={infoListClass}>
          <li>暗号データも含めて完全に削除します。</li>
          <li>再登録しない限り復元できません。</li>
        </ul>
        <button
          id="delete-account-btn"
          class={dangerBtnClass}
          data-username={userData.username}
          data-user-id={userData.userID}
          type="button"
        >
          アカウントを削除する
        </button>
      </section>

      <script src="/public/profile.js" type="module"></script>
    </div>
  );
};

export default Profile;
