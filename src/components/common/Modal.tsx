import { css, Style } from "hono/css";
import type { FC } from "hono/jsx";

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
    background: var(--header-bg);
    color: var(--text-color);
  `;

  const closeBtnClass = css`
    z-index: 10;
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
    color: #64748b;
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: #f1f5f9;
      color: var(--text-color);
    }
    &:focus {
      outline: 2px solid var(--primary-color);
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
      <dialog id="main-modal" class={dialogClass} aria-modal="true" closedby="any">
        <form method="dialog">
          <button type="submit" class={closeBtnClass} aria-label="Close modal" title="Close">
            ×
          </button>
        </form>
        <div id="main-modal-content"></div>
      </dialog>
    </>
  );
};

export default Modal;
