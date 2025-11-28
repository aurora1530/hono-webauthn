import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { trimTrailingSlash } from "hono/trailing-slash";
import { typedEnv } from "./env.js";
import { loginSessionMiddleware } from "./lib/auth/loginSession.js";
import { createRateLimitMiddleware } from "./lib/middleware/rateLimit.js";
import rootRenderer from "./rootRenderer.js";
import routerRootApp from "./routes/index.js";

const app = new Hono();
const authRateLimit = createRateLimitMiddleware({
  windowSec: typedEnv.RATE_LIMIT_WINDOW_SEC,
  maxRequests: typedEnv.RATE_LIMIT_MAX_REQUESTS,
  prefix: "auth",
});

app.use(logger());
app.use(trimTrailingSlash());
app.use(
  secureHeaders({
    xFrameOptions: "DENY",
    xXssProtection: "0",
    xContentTypeOptions: "nosniff",
    referrerPolicy: "no-referrer",
    crossOriginOpenerPolicy: "same-origin",
    crossOriginResourcePolicy: "same-origin",
  }),
);
app.use(csrf());
// Cache-Control for static assets
if (typedEnv.NODE_ENV === "production") {
  app.use("/public/icons/*", async (c, next) => {
    c.header("Cache-Control", "public, max-age=31536000, immutable");
    return next();
  });
  app.use("/public/*", async (c, next) => {
    if (c.req.path.endsWith(".js")) {
      c.header("Cache-Control", "public, max-age=300");
    }
    return next();
  });
}
app.get("/public/*", serveStatic({ root: "./" }));
app.use("/auth/*", authRateLimit);
app.use("/profile/*", authRateLimit);
app.use(rootRenderer);
app.use(loginSessionMiddleware);

app.route("/", routerRootApp);

app
  .onError((err, c) => {
    console.error(err);
    c.status(500);
    return c.render("エラーが発生しました。Code: 500", {
      title: "500 Internal Server Error",
    });
  })
  .notFound((c) => {
    c.status(404);
    return c.render("ページが見つかりません。Code: 404", {
      title: "404 Not Found",
    });
  });

serve(
  {
    fetch: app.fetch,
    port: typedEnv.PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
