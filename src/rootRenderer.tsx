import { jsxRenderer } from 'hono/jsx-renderer';
import Header from './components/common/Header.js';

const rootRenderer = jsxRenderer(({ children, title }) => {
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
      </head>
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
});

export default rootRenderer;
