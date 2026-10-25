import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app.js";
import { typedEnv } from "./env.js";

const app = createApp(serveStatic({ root: "./" }));
serve({ fetch: app.fetch, port: typedEnv.PORT }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});
