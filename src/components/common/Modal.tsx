import type { FC } from 'hono/jsx';
import { css, Style } from 'hono/css';

const Modal: FC = async () => {
  const dialogClass = css`
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
      </dialog>
    </>
  );
};

export default Modal;
