import { Hono } from "hono";
import { validator } from "hono/validator";
import z from "zod";
import Profile from "../../components/profile/Profile.tsx";
import { loginSessionController } from "../../lib/auth/loginSession.ts";

const profileApp = new Hono();

export const profileRoutes = profileApp
  .get("/", async (c) => {
    const isLoginedIn = !!(await loginSessionController.getUserData(c));
    if (!isLoginedIn) {
      return c.redirect("/auth/login");
    }

    return c.render(<Profile />, {
      title: "プロフィール",
    });
  })
  .post(
    "/change-debug-mode",
    validator("json", (value, c) => {
      const parsed = z.object({ debugMode: z.boolean() }).safeParse(value);
      if (!parsed.success) {
        return c.json(
          {
            error: "リクエストが不正です。",
          },
          400,
        );
      }

      return parsed.data;
    }),
    async (c) => {
      const isLoginedIn = !!(await loginSessionController.getUserData(c));
      if (!isLoginedIn) {
        return c.json({ error: "ログインしてください" }, 401);
      }

      const { debugMode } = c.req.valid("json");
      await loginSessionController.changeDebugMode(c, debugMode);
      return c.json({}, 200);
    },
  );

export default profileApp;
