import { Hono } from "hono";
import { validator } from "hono/validator";
import z from "zod";
import Profile from "../../components/profile/Profile.js";
import { buildDeletionSummary } from "../../lib/auth/deleteAccount.js";
import { loginSessionController } from "../../lib/auth/loginSession.js";
import { reauthSessionController } from "../../lib/auth/reauthSession.js";
import { buildLoginRedirectUrl } from "../../lib/auth/redirect.js";
import prisma from "../../prisma.js";
import { rpID } from "../auth/webauthn/constant.js";

const profileApp = new Hono();

export const profileRoutes = profileApp
  .get("/", async (c) => {
    const loginState = await loginSessionController.getLoginState(c);
    if (loginState.state !== "LOGGED_IN") {
      return c.redirect(buildLoginRedirectUrl(c.req.raw));
    }

    return c.render(<Profile />, {
      title: "プロフィール",
    });
  })
  .get("/account-deletion/summary", async (c) => {
    const loginState = await loginSessionController.getLoginState(c);
    if (loginState.state !== "LOGGED_IN") {
      return c.json({ error: "ログインしてください" }, 401);
    }

    const summary = await buildDeletionSummary(
      loginState.userData.userID,
      loginState.userData.username,
    );
    return c.json(summary, 200);
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
      const loginState = await loginSessionController.getLoginState(c);
      if (loginState.state !== "LOGGED_IN") {
        return c.json({ error: "ログインしてください" }, 401);
      }

      const { debugMode } = c.req.valid("json");
      await loginSessionController.changeDebugMode(c, debugMode);
      return c.json({}, 200);
    },
  )
  .post(
    "/delete-account",
    validator("json", (value, c) => {
      const parsed = z
        .object({
          confirmationText: z.string().trim().min(1).max(256),
        })
        .safeParse(value);
      if (!parsed.success) {
        return c.json({ error: "リクエストが不正です" }, 400);
      }
      return {
        confirmationText: parsed.data.confirmationText.trim(),
      };
    }),
    async (c) => {
      const loginState = await loginSessionController.getLoginState(c);
      if (loginState.state !== "LOGGED_IN") {
        return c.json({ error: "ログインしてください" }, 401);
      }

      const reauthData = await reauthSessionController.extractSessionData(c);
      if (!reauthData || reauthData.userId !== loginState.userData.userID) {
        return c.json({ error: "再認証が必要です" }, 401);
      }

      const summary = await buildDeletionSummary(
        loginState.userData.userID,
        loginState.userData.username,
      );
      const { confirmationText } = c.req.valid("json");

      if (confirmationText !== summary.confirmationText) {
        return c.json(
          {
            error: "確認文字列が一致しません。表示された文字列を正確に入力してください。",
            expected: summary.confirmationText,
          },
          400,
        );
      }

      const passkeyIds = await prisma.passkey.findMany({
        where: { userID: loginState.userData.userID },
        select: { id: true },
      });

      try {
        await prisma.$transaction(async (tx) => {
          await tx.prfCiphertext.deleteMany({
            where: { userID: loginState.userData.userID },
          });

          if (passkeyIds.length > 0) {
            await tx.passkeyHistory.deleteMany({
              where: {
                passkeyID: {
                  in: passkeyIds.map((p) => p.id),
                },
              },
            });
          }

          await tx.passkey.deleteMany({
            where: { userID: loginState.userData.userID },
          });

          await tx.user.delete({
            where: { id: loginState.userData.userID },
          });
        });
      } catch (error) {
        console.error("Failed to delete account", error);
        return c.json({ error: "アカウントの削除に失敗しました" }, 500);
      }

      await loginSessionController.setLoggedOut(c);

      return c.json(
        {
          deleted: true,
          ciphertextCount: summary.ciphertextCount,
          passkeyCount: summary.passkeyCount,
          passkeyHistoryCount: summary.passkeyHistoryCount,
          rpId: rpID,
          credentialIds: passkeyIds.map((p) => p.id),
        },
        200,
      );
    },
  );

export default profileApp;
