import { css } from "hono/css";
import type { FC } from "hono/jsx";
import Modal from "../common/Modal.js";

export type DeletionReason = "LAST_ONE" | "CURRENT_SESSION" | "HAS_LOCK";

const reasonText: Record<DeletionReason, string> = {
  LAST_ONE: "アカウントに紐づくパスキーが残り1つのため",
  CURRENT_SESSION: "現在のセッションで使用中のパスキーのため",
  HAS_LOCK: "暗号化データが紐づいているため",
};

type Props = {
  reasons: DeletionReason[];
  dialogID: string;
};

export const genPasskeyDeletionReasonModalID = () => {
  const random = Math.random().toString(36).substring(2, 8);
  return `passkey-deletion-reason-modal-${random}`;
};

export const PasskeyDeletionReasonModal: FC<Props> = ({ reasons, dialogID }) => {
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

  return (
    <Modal dialogID={dialogID}>
      <h2 class={title}>
        <span class="material-symbols-outlined">error</span>
        削除できません
      </h2>
      <p
        class={css`
            margin-bottom: 16px;
            font-size: 0.95rem;
          `}
      >
        以下の理由により、このパスキーは削除できません。
      </p>
      <ul class={list}>
        {reasons.map((reason) => (
          <li key={reason} class={listItem}>
            <span
              class="material-symbols-outlined"
              style="font-size: 20px; color: var(--color-text-muted);"
            >
              check_circle
            </span>
            <span>{reasonText[reason]}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
};
