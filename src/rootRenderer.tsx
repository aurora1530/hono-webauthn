import { jsxRenderer } from 'hono/jsx-renderer';
import Header from './components/common/Header.js';
import { css, cx, Style } from 'hono/css';
import Modal from './components/common/Modal.js';

const rootRenderer = jsxRenderer(({ children, title }) => {
  const htmlClass = css`
    margin: 0;
    padding: 0;
    font-family: 'Inter', sans-serif;
    --primary-color: #2563eb;
    --primary-hover: #1d4ed8;
    --bg-color: #f8fafc;
    --text-color: #1e293b;
    --header-bg: #ffffff;
    --border-color: #e2e8f0;
  `;

  const bodyClass = cx(
    htmlClass,
    css`
      height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: var(--bg-color);
      color: var(--text-color);
    `
  );

  const mainClass = css`
    flex: 1;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    box-sizing: border-box;
  `;

  return (
    <html lang="ja" class={htmlClass}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
          rel="stylesheet"
        />
        <Style />
      </head>
      <body class={bodyClass}>
        <Header />
        <Modal />
        <main class={mainClass}>{children}</main>
      </body>
    </html>
  );
});

export default rootRenderer;
