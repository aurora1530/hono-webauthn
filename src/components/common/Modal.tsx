import { css, Style } from "hono/css";
import type { Child, FC } from "hono/jsx";

type Props = {
  dialogID: string;
  contentWrapperID?: string;
  children?: Child;
  isOpenInitially?: boolean;
};

const Modal: FC<Props> = async ({ dialogID, contentWrapperID, children, isOpenInitially }) => {
  const dialogClass = css`
    position: fixed;
    inset: 0;
    margin: auto;
    z-index: 1000;
    box-sizing: border-box;
    border: none;
    border-radius: 12px;
    padding: 16px 20px;
    width: min(88vw, 520px);
    max-height: 85vh;
    overflow: auto;
    box-shadow: var(--shadow-md);
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
    color: var(--color-text-subtle);
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: var(--color-surface-muted);
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
      <dialog
        id={dialogID}
        class={dialogClass}
        aria-modal="true"
        closedby="any"
        open={isOpenInitially}
      >
        <form method="dialog">
          <button type="submit" class={closeBtnClass} aria-label="Close modal" title="Close">
            ×
          </button>
        </form>
        <div id={contentWrapperID}>{children}</div>
      </dialog>
    </>
  );
};

export default Modal;
