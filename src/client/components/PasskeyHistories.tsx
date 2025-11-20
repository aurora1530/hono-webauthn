import { css } from 'hono/css';
import { PasskeyHistory } from '@prisma/client';

type PasskeyHistoryProps = {
  histories: (Omit<PasskeyHistory, 'id'> & { usedAt: Date })[];
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onChangePage: (nextPage: number) => void;
};

const PasskeyHistories = ({ histories, page, totalPages, total, limit, onChangePage }: PasskeyHistoryProps) => {
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
    display: grid;
    grid-template-columns: 1fr auto auto;
    column-gap: 12px;
    align-items: center;
    background: var(--header-bg);
  `;

  const timeClass = css`
    font-weight: 600;
  `;

  const badgeClass = css`
    font-size: 12px;
    color: #64748b;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    padding: 2px 6px;
    border-radius: 9999px;
    white-space: nowrap;
  `;

  const emptyClass = css`
    color: #64748b;
    text-align: center;
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
      <h3 class={titleClass}>利用履歴（{total}件）</h3>
      <p class={pagerInfoClass}>{page} / {totalPages} ページ（{limit}件ずつ）</p>

      {histories.length === 0 ? (
        <p class={emptyClass}>利用履歴はまだありません。</p>
      ) : (
        <ul class={listClass}>
          {histories.map((h) => (
            <li key={`${h.passkeyID}-${h.usedAt.toISOString()}`} class={itemClass}>
              <span class={timeClass}>{h.usedAt.toLocaleString()}</span>
              <span class={badgeClass} title={h.usedBrowser}>
                🧭 {h.usedBrowser}
              </span>
              <span class={badgeClass} title={h.usedOS}>
                💻 {h.usedOS}
              </span>
            </li>
          ))}
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
