import { css, cx } from "hono/css";
import type { FC } from "hono/jsx";
import { useRequestContext } from "hono/jsx-renderer";
import { loginSessionController } from "../../lib/auth/loginSession.js";
import {
  badgeClass,
  buttonClass,
  pageTitleClass,
  sectionStackClass,
  surfaceClass,
  textMutedClass,
} from "../../ui/theme.js";

const Profile: FC = async () => {
  const c = useRequestContext();
  const userData = await loginSessionController.getUserData(c);

  if (!userData) {
    const backLinkClass = css`
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 700;
      &:hover {
        text-decoration: underline;
      }
    `;
    return (
      <div>
        <h1 class={pageTitleClass}>プロフィール</h1>
        <p class={textMutedClass}>ログインしてください。</p>
        <a href="/auth/login" class={backLinkClass}>
          ログインページへ
        </a>
      </div>
    );
  }

  const subHeadingClass = cx(
    textMutedClass,
    css`
      margin: 0 0 12px;
    `,
  );

  const infoListClass = css`
    list-style: none;
    padding: 0;
    margin: 8px 0 14px;
    display: grid;
    gap: 6px;
  `;

  const toggleRowClass = css`
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-weight: 600;
    cursor: pointer;
    user-select: none;
  `;

  const switchTrackClass = css`
    position: relative;
    width: 52px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    padding: 4px;
    border-radius: 999px;
    background: var(--color-border-strong);
    transition: background 0.2s ease;

    &::after {
      content: "";
      position: absolute;
      left: 4px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #fff;
      box-shadow: var(--shadow-sm);
      transition: left 0.2s ease;
    }

    &[data-enabled="true"] {
      background: var(--color-success);

      &::after {
        left: 26px;
      }
    }
  `;

  const dangerCardClass = surfaceClass("danger");
  const defaultCardClass = surfaceClass("default");

  const dangerButtonClass = buttonClass("danger", "md");

  return (
    <div class={sectionStackClass} style="max-width: 820px;">
      <header>
        <h1 class={pageTitleClass}>プロフィール</h1>
        <p class={subHeadingClass}>こんにちは、{userData.username} さん</p>
      </header>

      <section class={defaultCardClass}>
        <h2 class={css`margin:0 0 8px; font-size:18px; font-weight:700;`}>デバッグモード</h2>
        <p class={textMutedClass}>
          デバッグモードを有効化すると、通常は表示されない追加の情報が表示されます。
        </p>
        <label class={toggleRowClass}>
          <input
            type="checkbox"
            checked={!!userData.debugMode}
            id="change-debug-mode-btn"
            class={css`
              position: absolute;
              opacity: 0;
              pointer-events: none;
            `}
          />
          <span
            class={switchTrackClass}
            data-enabled={String(!!userData.debugMode)}
            aria-hidden="true"
          />
          <span>デバッグモードを有効にする</span>
        </label>
      </section>

      <section class={defaultCardClass}>
        <h2 class={css`margin:0 0 8px; font-size:18px; font-weight:700;`}>PRF プレイグラウンド</h2>
        <p class={textMutedClass}>
          暗号化/復号の進行を示すアニメーションを表示するかどうかを切り替えます。
        </p>
        <label class={toggleRowClass}>
          <input
            type="checkbox"
            defaultChecked
            id="toggle-prf-animation"
            class={css`
              position: absolute;
              opacity: 0;
              pointer-events: none;
            `}
          />
          <span class={switchTrackClass} data-enabled="true" aria-hidden="true" />
          <span>アニメーションを有効にする（このブラウザに保存）</span>
        </label>
        <p class={textMutedClass}>
          設定はローカルストレージにのみ保存され、サーバーには送信されません。
        </p>
      </section>

      <section class={dangerCardClass}>
        <h2 class={css`margin:0 0 8px; font-size:18px; font-weight:700;`}>アカウント削除</h2>
        <p class={textMutedClass}>
          この操作は取り消せません。すべてのパスキー、履歴、暗号データを削除します。
        </p>
        <div class={badgeClass("warning")}>Danger zone</div>
        <ul class={infoListClass}>
          <li>暗号データも含めて完全に削除します。</li>
          <li>復元は不可能です。</li>
        </ul>
        <button
          id="delete-account-btn"
          class={dangerButtonClass}
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
