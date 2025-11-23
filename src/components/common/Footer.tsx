import { css } from "hono/css";
import type { FC } from "hono/jsx";

const Footer: FC = () => {
  const footerClass = css`
    border-top: 1px solid var(--color-border-strong);
    background: var(--color-surface-strong);
    margin-top: auto;
    padding: 18px 0;
  `;

  const innerClass = css`
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
    display: flex;
    justify-content: flex-end;
  `;

  const iconLinkClass = css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--color-border);
    background: var(--color-surface-muted);
    color: var(--color-text);
    text-decoration: none;
    transition: border-color 0.18s ease, color 0.18s ease, background-color 0.18s ease,
      transform 0.12s ease;

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: color-mix(in srgb, var(--color-surface-muted) 70%, white);
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  `;

  return (
    <footer class={footerClass}>
      <div class={innerClass}>
        <a
          class={iconLinkClass}
          href="https://github.com/aurora1530/hono-webauthn"
          alt="GitHub repository"
          aria-label="GitHub repository"
          target="_blank"
          rel="noreferrer noopener"
        >
          <img
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="currentColor"
            src="/public/icons/github-mark.svg"
            alt="GitHub logo"
          ></img>
        </a>
      </div>
    </footer>
  );
};

export default Footer;
