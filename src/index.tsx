import { esbuildTranspiler } from '@hono/esbuild-transpiler/node';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { trimTrailingSlash } from 'hono/trailing-slash';
import rootRenderer from './rootRenderer.js';

const app = new Hono();

app.use(logger());
app.use(trimTrailingSlash());
app.get('/public/:scriptName{.+.tsx?}', esbuildTranspiler());
app.get('/public/*', serveStatic({ root: './' }));
app.use(secureHeaders());
app.use(rootRenderer);

app.get('/', (c) => {
  return c.text('Hello Hono!');
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
