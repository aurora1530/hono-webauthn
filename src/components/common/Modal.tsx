import type { FC } from 'hono/jsx';
import { css, Style } from 'hono/css';

const Modal: FC = async () => {
  const dialogClass = css`
    position: relative;
    box-sizing: border-box;
    border: none;
    border-radius: 12px;
    padding: 16px 20px;
    width: min(88vw, 520px);
    max-height: 85vh;
    overflow: auto;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    background: #ffffff;
    color: #111827; /* gray-900 */
  `;

  const closeBtnClass = css`
    position: absolute;
    top: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #6b7280; /* gray-500 */
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: #f3f4f6; /* gray-100 */
      color: #111827;
    }
    &:focus {
      outline: 2px solid #3b82f6; /* blue-500 */
      outline-offset: 2px;
    }
  `;

  return (
    <>
      <Style>
        {css`
          .${dialogClass}::backdrop {
            background: rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(2px);
          }
        `}
      </Style>
      <dialog id="main-modal" class={dialogClass} role="dialog" aria-modal="true" closedby="any">
        <form method="dialog">
          <button
            type="submit"
            class={closeBtnClass}
            aria-label="Close modal"
            title="Close"
          >
            ×
          </button>
        </form>
        <div id="main-modal-content"></div>
      </dialog>
    </>
  );
};

export default Modal;
