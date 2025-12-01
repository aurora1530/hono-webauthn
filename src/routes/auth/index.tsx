import { Hono } from "hono";
import { validator } from "hono/validator";
import { usernameSchema } from "src/lib/schema/user.js";
import z from "zod";
import AccountRegisterForm from "../../components/auth/AccountRegisterForm.js";
import AuthPage from "../../components/auth/AuthPage.js";
import LoginForm from "../../components/auth/LoginForm.js";
import PasskeyManagement from "../../components/auth/PasskeyManagemet.js";
import PrfPlayground from "../../components/auth/PrfPlayground.js";
import { findHistories } from "../../lib/auth/history.js";
import { loginSessionController } from "../../lib/auth/loginSession.js";
import { buildLoginRedirectUrl, extractRedirectPath } from "../../lib/auth/redirect.js";
import { webauthnSessionController } from "../../lib/auth/webauthnSession.js";
import prisma from "../../prisma.js";
import authPageRenderer from "./renderer.js";
import webauthnApp from "./webauthn/index.js";

const authApp = new Hono();

authApp.route("/webauthn", webauthnApp);

export const authAppRoutes = authApp
  .use(authPageRenderer)
  .get("/", (c) => {
    return c.render(<AuthPage />, {
      title: "WebAuthn Demo",
    });
  })
  .get("/logout", async (c) => {
    await loginSessionController.setLoggedOut(c);
    return c.redirect("/");
  })
  .get("/login", async (c) => {
    const userData = await loginSessionController.getUserData(c);
    if (userData) {
      const redirectPath = extractRedirectPath(c.req.raw);
      return c.redirect(redirectPath ?? "/");
    }

    return c.render(<LoginForm />, {
      title: "ログイン",
    });
  })
  .get("/register", (c) => {
    return c.render(<AccountRegisterForm />, {
      title: "アカウント登録",
    });
  })
  .post(
    "/username-validate",
    validator("json", (value, c) => {
      const parsed = usernameSchema.safeParse(value.username);
      if (!parsed.success) {
        return c.json(
          {
            valid: false,
            error: "ユーザー名は1〜64文字、半角英数字のみ使用できます。",
          },
          400,
        );
      }

      return { username: parsed.data };
    }),
    async (c) => {
      const { username } = c.req.valid("json");

      const alreadyExists = await prisma.user.findUnique({
        where: {
          name: username,
        },
      });

      if (alreadyExists) {
        return c.json(
          {
            valid: false,
            error: "ユーザー名が既に存在します。",
          },
          400,
        );
      }

      return c.json(
        {
          valid: true,
        },
        200,
      );
    },
  )
  .post(
    "/register",
    validator("json", (value, c) => {
      const parsed = z.object({ username: usernameSchema }).safeParse(value);
      if (!parsed.success) {
        return c.json(
          {
            error: "ユーザー名は1〜64文字、半角英数字のみ使用できます。",
          },
          400,
        );
      }

      return parsed.data;
    }),
    async (c) => {
      const { username } = c.req.valid("json");

      const alreadyExists = await prisma.user.findUnique({
        where: {
          name: username,
        },
      });

      if (alreadyExists) {
        return c.json(
          {
            error: "ユーザー名が既に存在します。",
          },
          400,
        );
      }

      await webauthnSessionController.registration.generate.initialize(c, {
        username: username,
      });

      return c.json({}, 200);
    },
  )
  .get("/passkey-management", async (c) => {
    const userData = await loginSessionController.getUserData(c);
    if (!userData) {
      return c.redirect(buildLoginRedirectUrl(c.req.raw));
    }

    const passkeys = await prisma.passkey.findMany({
      where: {
        userID: userData.userID,
      },
      include: {
        _count: {
          select: {
            prfCiphertexts: true,
          },
        },
      },
    });

    const histories = await findHistories(passkeys.map((pk) => pk.id));
    const passkeyData = passkeys.map((pk) => {
      const { _count, ...passkeyRecord } = pk;
      return {
        passkey: passkeyRecord,
        lastUsed: histories[pk.id]?.[0],
        prfCiphertextCount: _count.prfCiphertexts,
      };
    });

    return c.render(
      <PasskeyManagement
        passkeyData={passkeyData}
        currentPasskeyID={userData.usedPasskeyID}
        debugMode={userData.debugMode}
      />,
      { title: "パスキー管理" },
    );
  })
  .get("/prf", async (c) => {
    const userData = await loginSessionController.getUserData(c);
    if (!userData) {
      return c.redirect(buildLoginRedirectUrl(c.req.raw));
    }
    return c.render(<PrfPlayground />, {
      title: "WebAuthn PRF 暗号化",
    });
  });

export default authApp;
