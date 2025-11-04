import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { trimTrailingSlash } from 'hono/trailing-slash';
import rootRenderer from './rootRenderer.js';
import routerRootApp from './routes/index.js';
import { loginSessionMiddleware } from './lib/auth/loginSession.js';
import { csrf } from 'hono/csrf';

const app = new Hono();

app.use(logger());
app.use(trimTrailingSlash());
app.use(
  secureHeaders({
    xFrameOptions: 'DENY',
    xXssProtection: '0',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'no-referrer',
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-origin',
  })
);
app.use(csrf());
app.get('/public/*', serveStatic({ root: './' }));
app.use(rootRenderer);
app.use(loginSessionMiddleware);

app.route('/', routerRootApp);

app
  .onError((err, c) => {
    console.error(err);
    c.status(500);
    return c.render('エラーが発生しました。Code: 500', {
      title: '500 Internal Server Error',
    });
  })
  .notFound((c) => {
    c.status(404);
    return c.render('ページが見つかりません。Code: 404', {
      title: '404 Not Found',
    });
  });

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
