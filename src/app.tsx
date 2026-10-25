import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { trimTrailingSlash } from "hono/trailing-slash";
import { typedEnv } from "./env.js";
import {
  loginSessionController,
  loginSessionExpirationMiddleware,
} from "./lib/auth/loginSession.js";
import { createRateLimitMiddleware } from "./lib/middleware/rateLimit.js";
import { requestBodyLimit } from "./lib/middleware/requestBodyLimit.js";
import rootRenderer from "./rootRenderer.js";
import routerRootApp from "./routes/index.js";

export function createApp(servePublic: MiddlewareHandler) {
  const app = new Hono();
  const authRateLimit = createRateLimitMiddleware({
    windowSec: typedEnv.RATE_LIMIT_WINDOW_SEC,
    maxRequests: typedEnv.RATE_LIMIT_MAX_REQUESTS,
    prefix: "auth",
    trustedProxies: typedEnv.RATE_LIMIT_TRUSTED_PROXIES,
    userIdentifier: async (c) => {
      const loginState = await loginSessionController.getLoginState(c);
      return loginState.state === "LOGGED_IN" ? loginState.userData.userID : undefined;
    },
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
  app.use(requestBodyLimit);
  app.use(csrf());
  // Cache-Control for static assets
  if (typedEnv.NODE_ENV === "production") {
    app.use("/public/icons/*", async (c, next) => {
      await next();
      if (c.res.ok) c.header("Cache-Control", "public, max-age=31536000, immutable");
    });
    app.use("/public/*", async (c, next) => {
      await next();
      if (c.res.ok && c.req.path.endsWith(".js")) {
        c.header("Cache-Control", "public, max-age=300");
      }
    });
  }

  app.use("/auth/*", authRateLimit);
  app.use("/profile/*", authRateLimit);
  app.get("/public/*", servePublic);
  app.use(loginSessionExpirationMiddleware);
  app.use(rootRenderer);

  app.route("/", routerRootApp);

  app
    .onError((err, c) => {
      if (err instanceof HTTPException) return err.getResponse();

      console.error("[app] Request failed", { name: err.name });
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

  return app;
}
