import { jsxRenderer } from 'hono/jsx-renderer';
import Header from './components/common/Header.js';
import { css, cx, Style } from 'hono/css';
import Modal from './components/common/Modal.js';

const rootRenderer = jsxRenderer(({ children, title, modalContent }) => {
  const htmlClass = css`
    margin:0;
    padding:0;
  `

  const bodyClass = cx(
    htmlClass,
    css`
      height: 100vh;
      display: flex;
      flex-direction: column;
    `
  )

  const mainClass = css`
    flex: 1;
  `

  return (
    <html lang="ja" class={htmlClass}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <Style/>
      </head>
      <body class={bodyClass}>
        <Header />
        {modalContent && <Modal>{modalContent}</Modal>}
        <main class={mainClass}>{children}</main>
      </body>
    </html>
  );
});

export default rootRenderer;
