import prisma from "@infra/prisma.js";
import { aaguidToNameAndIcon } from "@lib/auth/aaguid.js";
import inferClientPlatform from "@lib/auth/inferClientPlatform.js";
import { loginSessionController } from "@lib/auth/loginSession.js";
import handlePostAuthentication from "@lib/auth/postAuthentication.js";
import { reauthSessionController } from "@lib/auth/reauthSession.js";
import { isAuthenticatorTransportFuture } from "@lib/auth/transport.js";
import { webauthnSessionController } from "@lib/auth/webauthnSession.js";
import { type Passkey, type PasskeyHistory, PasskeyHistoryType } from "@prisma/client";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type VerifiedAuthenticationResponse,
  type VerifiedRegistrationResponse,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import { Hono } from "hono";
import { validator } from "hono/validator";
import z from "zod";
import { MAX_PASSKEYS_PER_USER, ORIGIN, rpID, rpName } from "./constant.js";
import prfApp from "./prf/routes.js";

const webauthnApp = new Hono();
webauthnApp.route("/prf", prfApp);

export const webAuthnRoutes = webauthnApp
  .get("/registration/generate", async (c) => {
    const loginSessionData = await loginSessionController.getUserData(c);
    const username =
      loginSessionData?.username ??
      (await webauthnSessionController.registration.generate.extractSessionData(c))?.username;

    if (!username) {
      return c.json(
        {
          error: "セッションが不正です。登録をやり直してください。",
        },
        401,
      );
    }

    if (loginSessionData) {
      // ログイン済みであれば、再認証がなされているかのチェック（本来の手順を済ませていれば適切に再認証がされているはずなので、単にエラーを返すだけで良い）
      const reauthData = await reauthSessionController.extractSessionData(c);
      if (loginSessionData.userID !== reauthData?.userId) {
        return c.json(
          {
            error: "再認証が必要です。再度認証を行ってください。",
          },
          401,
        );
      }
    }

    // ログイン済みユーザであれば、これはパスキーを作成するリクエストなので、既存のパスキーを取得する
    const userID = loginSessionData?.userID;
    const savedPasskeys: Passkey[] = userID
      ? await prisma.passkey.findMany({
          where: {
            userID: userID,
          },
        })
      : [];

    if (savedPasskeys.length >= MAX_PASSKEYS_PER_USER) {
      return c.json(
        {
          error: `パスキーは最大${MAX_PASSKEYS_PER_USER}つまで作成可能です。`,
        },
        400,
      );
    }

    const savedWebAuthnUserId = savedPasskeys[0]?.webauthnUserID;

    const options: PublicKeyCredentialCreationOptionsJSON = await generateRegistrationOptions({
      rpID,
      rpName,
      userName: username,
      userDisplayName: username,
      userID: savedWebAuthnUserId ? isoUint8Array.fromUTF8String(savedWebAuthnUserId) : undefined,
      excludeCredentials: savedPasskeys.map((p) => {
        return {
          id: p.id,
          type: "public-key",
        };
      }),
      authenticatorSelection: {
        residentKey: "required",
        requireResidentKey: true,
      },
    });

    await webauthnSessionController.registration.verify.initialize(c, options);

    return c.json(options, 200);
  })
  .post(
    "/registration/verify",
    validator("json", (value, c) => {
      const parsed = z.object({ body: z.any() }).safeParse(value);
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
      const webauthnRegistrationSession =
        await webauthnSessionController.registration.verify.extractSessionData(c);

      if (!webauthnRegistrationSession?.user || !webauthnRegistrationSession.challenge) {
        return c.json(
          {
            error: "セッションが不正です。作成をやり直してください。",
          },
          401,
        );
      }

      const body = c.req.valid("json").body;
      let verification: VerifiedRegistrationResponse;
      try {
        verification = await verifyRegistrationResponse({
          response: body,
          expectedChallenge: webauthnRegistrationSession.challenge,
          expectedOrigin: ORIGIN,
          expectedRPID: rpID,
        });
      } catch (e) {
        console.error(e);
        return c.json(
          {
            error: "作成に失敗しました。もう一度やり直してください。",
          },
          400,
        );
      }

      const { verified, registrationInfo } = verification;

      if (!verified || !registrationInfo) {
        return c.json(
          {
            error: "作成に失敗しました。もう一度やり直してください。",
          },
          400,
        );
      }

      const { credential, credentialDeviceType, credentialBackedUp, aaguid } = registrationInfo;
      const passkeyName = aaguidToNameAndIcon(aaguid)?.name ?? "パスキー";
      const { os, browser } = inferClientPlatform(c.req.raw.headers);

      // 新規作成ならユーザを作成し、既存ユーザならセッションからIDを取得
      let userID = (await loginSessionController.getUserData(c))?.userID;
      try {
        await prisma.$transaction(async (tx) => {
          if (!userID) {
            const user = await tx.user.create({
              data: {
                name: webauthnRegistrationSession.user.name,
              },
            });
            userID = user.id;
          }

          await tx.passkey.create({
            data: {
              id: credential.id,
              webauthnUserID: webauthnRegistrationSession.user.id,
              userID,
              backedUp: credentialBackedUp,
              publicKey: credential.publicKey,
              transports: credential.transports,
              deviceType: credentialDeviceType,
              counter: credential.counter,
              aaguid,
              name: passkeyName,
              createdBrowser: browser,
              createdOS: os,
            },
          });
        });
      } catch (e) {
        console.error("Failed to create passkey record:", e);
        const error = userID
          ? "パスキーの保存に失敗しました。もう一度やり直してください。"
          : "ユーザの作成に失敗しました。もう一度やり直してください。";
        return c.json(
          {
            error,
          },
          400,
        );
      }

      return c.json({}, 200);
    },
  )
  .get("/authentication/generate", async (c) => {
    const options: PublicKeyCredentialRequestOptionsJSON = await generateAuthenticationOptions({
      rpID,
    });

    await webauthnSessionController.authentication.verify.initialize(c, options);

    return c.json(options, 200);
  })
  .post(
    "/authentication/verify",
    validator("json", (value, c) => {
      const parsed = z.object({ body: z.any() }).safeParse(value);
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
      const { challenge: savedChallenge } =
        (await webauthnSessionController.authentication.verify.extractSessionData(c)) || {};
      if (!savedChallenge) {
        return c.json(
          {
            error: "セッションが不正です。認証をやり直してください",
          },
          401,
        );
      }

      const body = c.req.valid("json").body;

      const savedPasskey = await prisma.passkey.findFirst({
        where: {
          id: body?.id,
        },
      });

      if (!savedPasskey) {
        return c.json(
          {
            error: "認証に失敗しました。もう一度やり直してください",
          },
          400,
        );
      }

      let verification: VerifiedAuthenticationResponse;
      try {
        verification = await verifyAuthenticationResponse({
          response: body,
          expectedChallenge: savedChallenge,
          expectedOrigin: ORIGIN,
          expectedRPID: rpID,
          credential: {
            id: savedPasskey.id,
            publicKey: savedPasskey.publicKey,
            counter: savedPasskey.counter,
            transports: savedPasskey.transports.filter(isAuthenticatorTransportFuture),
          },
        });
      } catch (e) {
        console.error(e);
        return c.json(
          {
            error: "認証に失敗しました。もう一度やり直してください",
          },
          400,
        );
      }

      const { verified, authenticationInfo } = verification;
      if (!verified || !authenticationInfo) {
        return c.json(
          {
            error: "認証に失敗しました。もう一度やり直してください",
          },
          400,
        );
      }

      // 認証したパスキーレコードからユーザ情報を取得
      const user = await prisma.user.findUnique({
        where: {
          id: savedPasskey.userID,
        },
      });

      if (!user) {
        return c.json(
          {
            error: "認証に失敗しました。もう一度やり直してください",
          },
          400,
        );
      }

      await handlePostAuthentication({
        savedPasskeyID: savedPasskey.id,
        newCounter: authenticationInfo.newCounter,
        backedUp: authenticationInfo.credentialBackedUp,
        headers: c.req.raw.headers,
        authType: PasskeyHistoryType.LOGIN,
      });

      await loginSessionController.setLoggedIn(c, {
        userID: user.id,
        username: user.name,
        usedPasskeyID: savedPasskey.id,
      });

      return c.json({}, 200);
    },
  )
  .get("/reauthentication/generate", async (c) => {
    const userData = await loginSessionController.getUserData(c);
    if (!userData) {
      return c.json(
        {
          error: "再認証にはログインが必要です。",
        },
        401,
      );
    }

    const savedPasskey = await prisma.passkey.findMany({
      where: {
        userID: userData.userID,
      },
    });

    const options: PublicKeyCredentialRequestOptionsJSON = await generateAuthenticationOptions({
      rpID,
      allowCredentials: savedPasskey.map((p) => ({
        id: p.id,
        transports: p.transports.filter(isAuthenticatorTransportFuture),
      })),
    });

    await webauthnSessionController.reauthentication.verify.initialize(c, options);

    return c.json(options, 200);
  })
  .post(
    "/reauthentication/verify",
    validator("json", (value, c) => {
      const parsed = z.object({ body: z.any() }).safeParse(value);
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
      const { challenge: savedChallenge } =
        (await webauthnSessionController.reauthentication.verify.extractSessionData(c)) || {};
      if (!savedChallenge) {
        return c.json(
          {
            error: "セッションが不正です。認証をやり直してください",
          },
          401,
        );
      }

      const loginSessionData = await loginSessionController.getUserData(c);
      if (!loginSessionData) {
        return c.json(
          {
            error: "ログインが必要です。",
          },
          401,
        );
      }

      const body = c.req.valid("json").body;

      const savedPasskey = await prisma.passkey.findFirst({
        where: {
          id: body?.id,
        },
      });

      if (!savedPasskey) {
        return c.json(
          {
            error: "認証に失敗しました。もう一度やり直してください",
          },
          400,
        );
      }

      if (loginSessionData.userID !== savedPasskey.userID) {
        return c.json(
          {
            error: "認証に失敗しました。もう一度やり直してください",
          },
          400,
        );
      }

      let verification: VerifiedAuthenticationResponse;
      try {
        verification = await verifyAuthenticationResponse({
          response: body,
          expectedChallenge: savedChallenge,
          expectedOrigin: ORIGIN,
          expectedRPID: rpID,
          credential: {
            id: savedPasskey.id,
            publicKey: savedPasskey.publicKey,
            counter: savedPasskey.counter,
            transports: savedPasskey.transports.filter(isAuthenticatorTransportFuture),
          },
        });
      } catch (e) {
        console.error(e);
        return c.json(
          {
            error: "認証に失敗しました。もう一度やり直してください",
          },
          400,
        );
      }

      const { verified, authenticationInfo } = verification;
      if (!verified || !authenticationInfo) {
        return c.json(
          {
            error: "認証に失敗しました。もう一度やり直してください",
          },
          400,
        );
      }

      await handlePostAuthentication({
        savedPasskeyID: savedPasskey.id,
        newCounter: authenticationInfo.newCounter,
        backedUp: authenticationInfo.credentialBackedUp,
        headers: c.req.raw.headers,
        authType: PasskeyHistoryType.REAUTH,
      });

      await reauthSessionController.initialize(c, {
        userId: loginSessionData.userID,
      });

      return c.json({}, 200);
    },
  )
  .post(
    "/test-authentication/generate",
    validator("json", (value, c) => {
      const parsed = z.object({ passkeyId: z.string().min(1) }).safeParse(value);
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
      const userData = await loginSessionController.getUserData(c);
      if (!userData) {
        return c.json(
          {
            error: "ログインが必要です。",
          },
          401,
        );
      }

      const { passkeyId } = c.req.valid("json");

      const passkey = await prisma.passkey.findFirst({
        where: {
          id: passkeyId,
          userID: userData.userID,
        },
      });

      if (!passkey) {
        return c.json(
          {
            error: "パスキーが見つかりません。",
          },
          404,
        );
      }

      const options: PublicKeyCredentialRequestOptionsJSON = await generateAuthenticationOptions({
        rpID,
        allowCredentials: [
          {
            id: passkey.id,
            transports: passkey.transports.filter(isAuthenticatorTransportFuture),
          },
        ],
      });

      await webauthnSessionController.testAuthentication.verify.initialize(c, {
        challenge: options.challenge,
        passkeyId,
      });

      return c.json(options, 200);
    },
  )
  .post(
    "/test-authentication/verify",
    validator("json", (value, c) => {
      const parsed = z.object({ body: z.any() }).safeParse(value);
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
      const sessionData =
        await webauthnSessionController.testAuthentication.verify.extractSessionData(c);
      if (!sessionData?.challenge) {
        return c.json(
          {
            error: "セッションが不正です。認証をやり直してください",
          },
          401,
        );
      }

      const loginSessionData = await loginSessionController.getUserData(c);
      if (!loginSessionData) {
        return c.json(
          {
            error: "ログインが必要です。",
          },
          401,
        );
      }

      const body = c.req.valid("json").body;

      const savedPasskey = await prisma.passkey.findFirst({
        where: {
          id: sessionData.passkeyId,
          userID: loginSessionData.userID,
        },
      });

      if (!savedPasskey) {
        return c.json(
          {
            error: "認証に失敗しました。もう一度やり直してください",
          },
          400,
        );
      }

      if (body?.id !== savedPasskey.id) {
        return c.json(
          {
            error: "認証に失敗しました。もう一度やり直してください",
          },
          400,
        );
      }

      let verification: VerifiedAuthenticationResponse;
      try {
        verification = await verifyAuthenticationResponse({
          response: body,
          expectedChallenge: sessionData.challenge,
          expectedOrigin: ORIGIN,
          expectedRPID: rpID,
          credential: {
            id: savedPasskey.id,
            publicKey: savedPasskey.publicKey,
            counter: savedPasskey.counter,
            transports: savedPasskey.transports.filter(isAuthenticatorTransportFuture),
          },
        });
      } catch (e) {
        console.error(e);
        return c.json(
          {
            error: "認証に失敗しました。もう一度やり直してください",
          },
          400,
        );
      }

      const { verified, authenticationInfo } = verification;
      if (!verified || !authenticationInfo) {
        return c.json(
          {
            error: "認証に失敗しました。もう一度やり直してください",
          },
          400,
        );
      }

      await handlePostAuthentication({
        savedPasskeyID: savedPasskey.id,
        newCounter: authenticationInfo.newCounter,
        backedUp: authenticationInfo.credentialBackedUp,
        headers: c.req.raw.headers,
        authType: PasskeyHistoryType.TEST,
      });

      return c.json({}, 200);
    },
  )
  .post(
    "/change-passkey-name",
    validator("json", (value, c) => {
      const parsed = z
        .object({
          passkeyId: z.string(),
          newName: z.string().trim().min(1).max(50),
        })
        .safeParse(value);
      if (!parsed.success) {
        if (parsed.error.issues.some((i) => i.code === "too_small" || i.code === "too_big")) {
          return c.json(
            {
              error: "パスキー名は1文字以上50文字以下である必要があります。",
            },
            400,
          );
        }
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
      const userData = await loginSessionController.getUserData(c);
      if (!userData) {
        return c.json(
          {
            error: "ログインが必要です。",
          },
          401,
        );
      }

      const { passkeyId, newName } = c.req.valid("json");

      const passkey = await prisma.passkey.findUnique({
        where: {
          id: passkeyId,
        },
      });

      if (!passkey || passkey.userID !== userData.userID) {
        return c.json(
          {
            error: "パスキーが見つかりません。",
          },
          404,
        );
      }

      await prisma.passkey.update({
        where: {
          id: passkeyId,
        },
        data: {
          name: newName,
        },
      });

      return c.json({}, 200);
    },
  )
  .post(
    "/delete-passkey",
    validator("json", (value, c) => {
      const parsed = z.object({ passkeyId: z.string() }).safeParse(value);
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
      const userData = await loginSessionController.getUserData(c);
      if (!userData) {
        return c.json(
          {
            error: "ログインが必要です。",
          },
          401,
        );
      }

      const reauthData = await reauthSessionController.extractSessionData(c);
      if (userData.userID !== reauthData?.userId) {
        return c.json(
          {
            error: "再認証が必要です。再度認証を行ってください。",
          },
          401,
        );
      }

      const { passkeyId } = c.req.valid("json");

      const targetPasskeyIsCurrentUsed = userData.usedPasskeyID === passkeyId;
      if (targetPasskeyIsCurrentUsed) {
        return c.json(
          {
            error: "現在使用中のパスキーは削除できません。",
          },
          400,
        );
      }

      const userHasAtLeastTwoPasskeys =
        (await prisma.passkey.count({
          where: {
            userID: userData.userID,
          },
        })) >= 2;

      if (!userHasAtLeastTwoPasskeys) {
        return c.json(
          {
            error: "削除後に最低でも1つのパスキーを保持する必要があります。",
          },
          400,
        );
      }

      const referencingCiphertexts = await prisma.prfCiphertext.count({
        where: {
          passkeyID: passkeyId,
          userID: userData.userID,
        },
      });

      if (referencingCiphertexts > 0) {
        return c.json(
          {
            error: "このパスキーで暗号化されたデータが残っているため削除できません。",
            ciphertextCount: referencingCiphertexts,
          },
          409,
        );
      }

      try {
        await prisma.passkeyHistory.deleteMany({
          where: {
            passkeyID: passkeyId,
          },
        });
        const deletedPasskey = await prisma.passkey.delete({
          where: {
            id: passkeyId,
            userID: userData.userID,
          },
        });
        return c.json(
          {
            rpId: rpID,
            passkeyId: deletedPasskey.id,
            passkeyName: deletedPasskey.name,
          },
          200,
        );
      } catch (e) {
        console.error(e);
        return c.json(
          {
            error: "パスキーの削除に失敗しました。",
          },
          500,
        );
      }
    },
  )
  .post(
    "/passkey-histories",
    validator("json", (value, c) => {
      const parsed = z
        .object({
          passkeyId: z.string(),
          limit: z.number().min(1).max(100).default(10),
          page: z.number().min(1).default(1),
        })
        .safeParse(value);
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
      const userData = await loginSessionController.getUserData(c);
      if (!userData) {
        return c.json(
          {
            error: "ログインが必要です。",
          },
          401,
        );
      }

      const { passkeyId, limit, page } = c.req.valid("json");

      const passkey = await prisma.passkey.findUnique({
        where: {
          id: passkeyId,
          userID: userData.userID,
        },
      });

      if (!passkey) {
        return c.json(
          {
            error: "パスキーが見つかりません。",
          },
          404,
        );
      }

      const histories: PasskeyHistory[] = await prisma.passkeyHistory.findMany({
        where: {
          passkeyID: passkeyId,
        },
        orderBy: {
          usedAt: "desc",
        },
        take: limit,
        skip: (page - 1) * limit,
      });

      const total: number = await prisma.passkeyHistory.count({
        where: {
          passkeyID: passkeyId,
        },
      });

      return c.json(
        {
          histories,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        200,
      );
    },
  )
  .post(
    "/passkey-histories/delete",
    validator("json", (value, c) => {
      const parsed = z.union([
        z.object({
          passkeyId: z.string(),
          historyIds: z.array(z.string()).min(1),
          deleteAll: z.literal(false).default(false),
        }),
        z.object({
          passkeyId: z.string(),
          deleteAll: z.literal(true),
          historyIds: z.never().optional(),
        }),
      ]);

      const result = parsed.safeParse(value);
      if (!result.success) {
        console.error(result.error);
        return c.json(
          {
            error: "リクエストが不正です。",
          },
          400,
        );
      }
      return result.data;
    }),
    async (c) => {
      const userData = await loginSessionController.getUserData(c);
      if (!userData) {
        return c.json(
          {
            error: "ログインが必要です。",
          },
          401,
        );
      }

      const requestData = c.req.valid("json");

      const targetPasskeyExists = await prisma.passkey.findUnique({
        where: {
          id: requestData.passkeyId,
          userID: userData.userID,
        },
      });

      if (!targetPasskeyExists) {
        return c.json(
          {
            error: "パスキーが見つかりません。",
          },
          404,
        );
      }

      let deletedPasskeyCount = 0;
      try {
        if (requestData.deleteAll) {
          const deleted = await prisma.passkeyHistory.deleteMany({
            where: {
              passkeyID: requestData.passkeyId,
            },
          });
          deletedPasskeyCount = deleted.count;
        } else {
          const deleted = await prisma.passkeyHistory.deleteMany({
            where: {
              passkeyID: requestData.passkeyId,
              id: {
                in: requestData.historyIds,
              },
            },
          });
          deletedPasskeyCount = deleted.count;
        }

        return c.json(
          {
            deletedCount: deletedPasskeyCount,
          },
          200,
        );
      } catch (e) {
        console.error(e);
        return c.json(
          {
            error: "利用履歴の削除に失敗しました。",
          },
          500,
        );
      }
    },
  )
  .get("/passkeys-list", async (c) => {
    const userData = await loginSessionController.getUserData(c);
    if (!userData) {
      return c.json({ error: "ログインが必要です" }, 401);
    }

    const passkeys = await prisma.passkey.findMany({
      where: {
        userID: userData.userID,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    });

    return c.json({ passkeys }, 200);
  });

export default webauthnApp;
