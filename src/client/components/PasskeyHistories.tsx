import { css } from 'hono/css';
import { PasskeyHistory } from '@prisma/client';

type PasskeyHistoryProps = {
  histories: Omit<PasskeyHistory, 'id'>[];
};

const PasskeyHistories = ({ histories }: PasskeyHistoryProps) => {
  const wrapClass = css`
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
    padding: 8px 0;
  `;

  const titleClass = css`
    font-size: 18px;
    font-weight: 600;
    margin: 8px 0 10px;
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
  `;

  return (
    <div class={wrapClass}>
      <h3 class={titleClass}>利用履歴（{histories.length}件）</h3>
      <ul class={listClass}>
        {histories.map((h) => {
          const usedAt = new Date(h.usedAt);
          return (
            <li key={h.passkeyID} class={itemClass}>
              <span class={timeClass}>{usedAt.toLocaleString()}</span>
              <span class={badgeClass} title={h.usedBrowser}>
                🧭 {h.usedBrowser}
              </span>
              <span class={badgeClass} title={h.usedOS}>
                💻 {h.usedOS}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasskeyHistories;
