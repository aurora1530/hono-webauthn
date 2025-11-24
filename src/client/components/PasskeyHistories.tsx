import type { PasskeyHistory } from "@prisma/client";
import { css, cx } from "hono/css";
import { badgeClass, buttonClass, surfaceClass, textMutedClass } from "../../ui/theme.js";
import { getPasskeyHistoryTypeLabel } from "../lib/passkeyHistoryType.js";
import { webauthnClient } from "../lib/rpc/webauthnClient.js";
import { showToast } from "../lib/toast.js";

type PasskeyHistoryProps = {
  passkeyId: string;
  histories: (PasskeyHistory & { usedAt: Date })[];
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onChangePage: (nextPage: number) => void;
  /** モーダルを再オープンする関数 */
  reload?: () => void;
};

const PasskeyHistories = ({
  passkeyId,
  histories,
  page,
  totalPages,
  total,
  limit,
  onChangePage,
  reload,
}: PasskeyHistoryProps) => {
  const deleteHistory = async (historyID: string) => {
    if (!confirm("本当にこの利用履歴を削除しますか？")) {
      return;
    }
    const res = await webauthnClient["passkey-histories"].delete.$post({
      json: {
        passkeyId,
        historyIds: [historyID],
        deleteAll: false,
      },
    });
    if (!res.ok) {
      showToast(`履歴の削除に失敗しました。${(await res.json()).error ?? ""}`.trim(), {
        variant: "error",
      });
      return;
    }

    const data = await res.json();
    if (data.deletedCount > 0) {
      // 親側でモーダルを開き直し（最新取得）か、単に再オープン関数で更新
      reload?.();
    } else {
      showToast("削除対象の履歴がありませんでした。", { variant: "error" });
    }
  };

  const deleteAllHistories = async () => {
    if (!confirm("本当に全ての利用履歴を削除しますか？")) {
      return;
    }
    const res = await webauthnClient["passkey-histories"].delete.$post({
      json: {
        passkeyId,
        deleteAll: true,
      },
    });
    if (!res.ok) {
      showToast(`履歴の削除に失敗しました。${(await res.json()).error ?? ""}`.trim(), {
        variant: "error",
      });
      return;
    }
    const data = await res.json();
    if (data.deletedCount > 0) {
      reload?.();
    } else {
      showToast("削除対象がありませんでした。", { variant: "error" });
    }
  };

  const wrapClass = css`
    position: relative;
    width: 100%;
    margin: 0 auto;
    padding: 0.5rem;
    box-sizing: border-box;
  `;

  const titleClass = css`
    font-size: 18px;
    font-weight: 600;
    margin: 8px 0 4px;
    text-align: center;
  `;

  const pagerInfoClass = cx(
    textMutedClass,
    css`
      font-size: 13px;
      text-align: center;
      margin: 0 0 10px;
    `,
  );

  const listClass = css`
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;

  const itemClass = cx(
    surfaceClass(),
    css`
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    `,
  );

  const timeColumnClass = css`
    flex: 1 1 220px;
    min-width: 200px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `;

  const timeClass = css`
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  `;

  const typeBadgeClass = badgeClass("neutral");

  const deviceInfoClass = cx(
    textMutedClass,
    css`
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      @media (max-width: 640px) {
        white-space: normal;
      }
    `,
  );

  const actionCellClass = css`
    margin-left: auto;
    display: inline-flex;
    align-self: center;
  `;

  const deleteIconClass = css`
    font-size: 18px;
    line-height: 1;
  `;

  const emptyClass = cx(
    textMutedClass,
    css`
      text-align: center;
    `,
  );

  const actionBarClass = css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  `;

  const deleteBtnClass = buttonClass("danger", "sm");
  const deleteAllBtnClass = buttonClass("danger", "sm");

  const pagerFloatClass = css`
    position: fixed;
    left: 50%;
    bottom: 24px;
    transform: translateX(-50%);
    display: flex;
    justify-content: center;
    width: 100%;
    pointer-events: none;
    z-index: 1000;
    padding: 0 16px;
  `;

  const pagerGroupClass = cx(
    surfaceClass("muted"),
    css`
      pointer-events: auto;
      display: inline-flex;
      align-items: center;
      gap: 12px;
      border-radius: 999px;
      padding: 8px 18px;
    `,
  );

  // Pagerボタンは元の薄グレー基調を維持
  const pagerButtonClass = css`
    font-size: 14px;
    font-weight: 600;
    border: none;
    border-radius: 999px;
    padding: 6px 14px;
    min-width: 86px;
    background: #e2e8f0;
    color: #0f172a;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;

    &:hover:not(:disabled) {
      background: #cbd5e1;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.45;
      background: #e2e8f0;
      color: #0f172a;
    }
  `;

  const pagerStatusClass = cx(
    textMutedClass,
    css`
      font-size: 13px;
      min-width: 80px;
      text-align: center;
    `,
  );

  return (
    <div class={wrapClass}>
      <div class={actionBarClass}>
        <div>
          <h3 class={titleClass}>利用履歴（{total}件）</h3>
          <p class={pagerInfoClass}>
            {page} / {totalPages} ページ（{limit}件ずつ）
          </p>
        </div>
        {total > 0 && (
          <button class={deleteAllBtnClass} onClick={deleteAllHistories} type="button">
            全削除
          </button>
        )}
      </div>

      {histories.length === 0 ? (
        <p class={emptyClass}>利用履歴はまだありません。</p>
      ) : (
        <ul class={listClass}>
          {histories.map((h) => {
            const typeLabel = getPasskeyHistoryTypeLabel(h.type);
            return (
              <li key={`${h.id}-${h.usedAt.toISOString()}`} class={itemClass}>
                <div class={timeColumnClass}>
                  <span class={timeClass}>{h.usedAt.toLocaleString()}</span>
                  <span class={deviceInfoClass} title={`${h.usedBrowser} on ${h.usedOS}`}>
                    {`${h.usedBrowser} on ${h.usedOS}`}
                  </span>
                </div>
                <span class={typeBadgeClass} title={`履歴種別: ${typeLabel}`}>
                  {typeLabel}
                </span>
                <button
                  class={`${deleteBtnClass} ${actionCellClass}`}
                  aria-label="履歴を削除"
                  title="履歴を削除"
                  data-history-id={h.id}
                  onClick={() => deleteHistory(h.id)}
                  type="button"
                >
                  <span class={`material-symbols-outlined ${deleteIconClass}`}>delete</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav class={pagerFloatClass} aria-label="ページ切り替え">
          <div class={pagerGroupClass}>
            <button
              class={pagerButtonClass}
              onClick={() => onChangePage(Math.max(1, page - 1))}
              disabled={page <= 1}
              type="button"
            >
              ◀ 前へ
            </button>
            <span class={pagerStatusClass}>
              {page} / {totalPages}
            </span>
            <button
              class={pagerButtonClass}
              onClick={() => onChangePage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              type="button"
            >
              次へ ▶
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default PasskeyHistories;
