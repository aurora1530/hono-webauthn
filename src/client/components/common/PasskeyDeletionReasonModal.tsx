import { buttonClass } from "@ui/theme.js";
import { css } from "hono/css";
import type { FC } from "hono/jsx";
import { closeModal } from "../../lib/modal/base.js";

export type DeletionReason = "LAST_ONE" | "CURRENT_SESSION" | "HAS_LOCK";

type Props = {
  reasons: DeletionReason[];
};

export const PasskeyDeletionReasonModal: FC<Props> = ({ reasons }) => {
  const container = css`
    padding: 24px;
    width: 100%;
    max-width: 400px;
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    color: var(--color-text);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  `;

  const title = css`
    font-size: 1.25rem;
    font-weight: bold;
    margin-bottom: 16px;
    color: var(--color-danger);
    display: flex;
    align-items: center;
    gap: 8px;
  `;

  const list = css`
    list-style: none;
    padding: 0;
    margin: 0 0 24px 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `;

  const listItem = css`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 0.95rem;
    line-height: 1.5;
  `;

  const actions = css`
    display: flex;
    justify-content: flex-end;
  `;

  const reasonText: Record<DeletionReason, string> = {
    LAST_ONE: "アカウントに紐づくパスキーが残り1つのため",
    CURRENT_SESSION: "現在のセッションで使用中のパスキーのため",
    HAS_LOCK: "暗号化データが紐づいているため",
  };

  return (
    <div class={container}>
      <h2 class={title}>
        <span class="material-symbols-outlined">error</span>
        削除できません
      </h2>
      <p class={css`margin-bottom: 16px; font-size: 0.95rem;`}>
        以下の理由により、このパスキーは削除できません。
      </p>
      <ul class={list}>
        {reasons.map((reason) => (
          <li key={reason} class={listItem}>
            <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-text-muted);">
              check_circle
            </span>
            <span>{reasonText[reason]}</span>
          </li>
        ))}
      </ul>
      <div class={actions}>
        <button type="button" onClick={() => closeModal()} class={buttonClass("primary", "md")}>
          閉じる
        </button>
      </div>
    </div>
  );
};
