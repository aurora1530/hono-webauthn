import { css } from 'hono/css';
import type { PasskeyHistory } from '@prisma/client';
import { webauthnClient } from '../lib/rpc/webauthnClient.js';
import { getPasskeyHistoryTypeLabel } from '../lib/passkeyHistoryType.ts';

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
    if(!confirm('本当にこの利用履歴を削除しますか？')) {
      return;
    }
    const res = await webauthnClient['passkey-histories']['delete'].$post({
      json: {
        passkeyId,
        historyIds: [historyID],
        deleteAll: false,
      },
    });
    if (!res.ok) {
      alert(`Error: Failed to delete history.${(await res.json()).error ?? ''}`);
      return;
    }

    const data = await res.json();
    if (data.deletedCount > 0) {
      // 親側でモーダルを開き直し（最新取得）か、単に再オープン関数で更新
      reload?.();
    } else {
      alert('Error: No histories were deleted.');
    }
  };

  const deleteAllHistories = async () => {
    if(!confirm('本当に全ての利用履歴を削除しますか？')) {
      return;
    }
    const res = await webauthnClient['passkey-histories']['delete'].$post({
      json: {
        passkeyId,
        deleteAll: true,
      },
    });
    if (!res.ok) {
      alert(`Error: Failed to delete histories.${(await res.json()).error ?? ''}`);
      return;
    }
    const data = await res.json();
    if (data.deletedCount > 0) {
      reload?.();
    } else {
      alert('削除対象がありませんでした。');
    }
  };

  const wrapClass = css`
    position: relative;
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
    padding: 8px 32px 8px; /* space for side nav buttons */
    box-sizing: border-box;
  `;

  const titleClass = css`
    font-size: 18px;
    font-weight: 600;
    margin: 8px 0 4px;
    text-align: center;
  `;

  const pagerInfoClass = css`
    font-size: 13px;
    color: #475569;
    text-align: center;
    margin: 0 0 10px;
  `;

  const listClass = css`
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;

  const itemClass = css`
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 16px;
    background: var(--header-bg);
    flex-wrap: wrap;

    @media (max-width: 640px) {
      align-items: flex-start;
      gap: 8px 12px;
    }
  `;

  const timeColumnClass = css`
    flex: 1 1 240px;
    display: flex;
    flex-direction: column;
    gap: 4px;

    @media (min-width: 641px) {
      flex: 0 0 220px;
    }
  `;

  const timeClass = css`
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  `;

  const typeBadgeClass = css`
    flex: 0 0 110px;
    font-size: 13px;
    color: #4338ca;
    font-weight: 500;
    white-space: nowrap;

    @media (max-width: 640px) {
      flex: 1 1 auto;
    }
  `;

  const deviceInfoClass = css`
    font-size: 13px;
    color: #334155;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: 640px) {
      white-space: normal;
    }
  `;

  const actionCellClass = css`
    margin-left: auto;
    display: inline-flex;
  `;

  const deleteIconClass = css`
    font-size: 18px;
    line-height: 1;
  `;

  const emptyClass = css`
    color: #64748b;
    text-align: center;
  `;

  const actionBarClass = css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  `;

  const buttonBase = css`
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    cursor: pointer;
    background: #f1f5f9;
    color: #0f172a;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    &:hover {
      background: #e2e8f0;
    }
    &:active {
      background: #cbd5e1;
    }
  `;

  const deleteBtnClass = css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    background: #fee2e2; /* red-100 */
    color: #991b1b; /* red-800 */
    transition: background-color 0.15s ease-in-out, opacity 0.15s;
    &:hover {
      background: #fecaca;
    }
    &:active {
      background: #fca5a5;
    }
  `;

  const deleteAllBtnClass = css`
    ${buttonBase};
    background: #f87171;
    color: #fff;
    border-color: #ef4444;
    &:hover {
      background: #ef4444;
    }
    &:active {
      background: #dc2626;
    }
  `;

  const navButtonBase = css`
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 28px;
    min-height: 110px;
    padding: 8px 6px;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid #e2e8f0;
    background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
    color: #0f172a;
    border-radius: 10px;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out, opacity 0.15s ease-in-out;

    &:hover:not(:disabled) {
      background: #e2e8f0;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `;

  const navPrevClass = css`
    left: 0;
  `;

  const navNextClass = css`
    right: 0;
  `;

  const navArrowClass = css`
    font-size: 14px;
  `;

  const navLabelClass = css`
    writing-mode: vertical-rl;
    font-size: 11px;
    letter-spacing: 0.08em;
  `;

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
          <button class={deleteAllBtnClass} onClick={deleteAllHistories}>
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
                >
                  <span class={`material-symbols-outlined ${deleteIconClass}`}>
                    delete
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <>
          <button
            class={`${navButtonBase} ${navPrevClass}`}
            onClick={() => onChangePage(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            <span class={navArrowClass}>◀</span>
            <span class={navLabelClass}>前へ</span>
          </button>
          <button
            class={`${navButtonBase} ${navNextClass}`}
            onClick={() => onChangePage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            <span class={navArrowClass}>▶</span>
            <span class={navLabelClass}>次へ</span>
          </button>
        </>
      )}
    </div>
  );
};

export default PasskeyHistories;
