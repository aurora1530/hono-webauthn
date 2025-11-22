import { PasskeyHistoryType } from "@prisma/client";
import {
  generateAuthenticationOptions,
  type VerifiedAuthenticationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { Hono } from "hono";
import { validator } from "hono/validator";
import z from "zod";
import { loginSessionController } from "../../../../lib/auth/loginSession.ts";
import handlePostAuthentication from "../../../../lib/auth/postAuthentication.ts";
import {
  buildPrfExtensions,
  decodeBase64ToBytesWithBounds,
  PRF_CONSTRAINTS,
} from "../../../../lib/auth/prfHelpers.ts";
import { isAuthenticatorTransportFuture } from "../../../../lib/auth/transport.ts";
import { webauthnSessionController } from "../../../../lib/auth/webauthnSession.ts";
import { BASE64_REGEX } from "../../../../lib/base64.ts";
import prisma from "../../../../prisma.ts";
import { ORIGIN, rpID } from "../constant.ts";
import {
  DEFAULT_PRF_ENTRIES_LIMIT,
  MAX_PRF_ENTRIES_LIMIT,
  MAX_PRF_ENTRIES_PAGE,
} from "./constant.ts";

const prfApp = new Hono();

export const prfRoutes = prfApp
  .post(
    "/assertion/generate",
    validator("json", (value, c) => {
      const parsed = z
        .object({
          passkeyId: z.string().min(1),
          prfInput: z
            .string()
            .trim()
            .min(1)
            .max(PRF_CONSTRAINTS.prfInput.exactLength)
            .regex(BASE64_REGEX),
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

      const { passkeyId, prfInput } = c.req.valid("json");
      const prfInputBytes = decodeBase64ToBytesWithBounds(prfInput, {
        min: PRF_CONSTRAINTS.prfInput.byteLength,
        max: PRF_CONSTRAINTS.prfInput.byteLength,
      });

      if (!prfInputBytes) {
        return c.json(
          {
            error: "PRF入力が不正です。",
          },
          400,
        );
      }

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
        extensions: buildPrfExtensions(prfInputBytes),
      });

      await webauthnSessionController.prfAuthentication.verify.initialize(c, {
        challenge: options.challenge,
        passkeyId,
      });

      return c.json(options, 200);
    },
  )
  .post(
    "/assertion/verify",
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
        await webauthnSessionController.prfAuthentication.verify.extractSessionData(c);
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
            error: "パスキーが見つかりません。",
          },
          404,
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
        authType: PasskeyHistoryType.PRF,
      });

      return c.json({}, 200);
    },
  )
  .post(
    "/encrypt",
    validator("json", (value, c) => {
      const parsed = z
        .object({
          passkeyId: z.string().min(1),
          label: z.string().max(PRF_CONSTRAINTS.label.maxLength).optional(),
          ciphertext: z
            .string()
            .min(1)
            .max(PRF_CONSTRAINTS.ciphertext.maxLength)
            .regex(BASE64_REGEX),
          iv: z.string().min(1).regex(BASE64_REGEX),
          tag: z.string().min(1).regex(BASE64_REGEX),
          associatedData: z.string().max(PRF_CONSTRAINTS.associatedData.maxLength).optional(),
          version: z.number().int().min(1).max(10).default(1),
          prfInput: z.string().min(1).max(PRF_CONSTRAINTS.prfInput.exactLength).regex(BASE64_REGEX),
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

      const body = c.req.valid("json");
      const normalizedLabel = body.label?.trim();
      const label = normalizedLabel && normalizedLabel.length > 0 ? normalizedLabel : undefined;
      const normalizedAssociatedData = body.associatedData?.trim();
      const associatedData =
        normalizedAssociatedData && normalizedAssociatedData.length > 0
          ? normalizedAssociatedData
          : undefined;

      const ciphertextBytes = decodeBase64ToBytesWithBounds(body.ciphertext, {
        min: 1,
        max: PRF_CONSTRAINTS.maxCiphertextBytes,
      });
      const ivBytes = decodeBase64ToBytesWithBounds(body.iv, {
        min: PRF_CONSTRAINTS.ivByteLength,
        max: PRF_CONSTRAINTS.ivByteLength,
      });
      const tagBytes = decodeBase64ToBytesWithBounds(body.tag, {
        min: PRF_CONSTRAINTS.tagByteLength,
        max: PRF_CONSTRAINTS.tagByteLength,
      });
      const prfInputBytes = decodeBase64ToBytesWithBounds(body.prfInput, {
        min: PRF_CONSTRAINTS.prfInput.byteLength,
        max: PRF_CONSTRAINTS.prfInput.byteLength,
      });

      if (!ciphertextBytes || !ivBytes || !tagBytes || !prfInputBytes) {
        return c.json(
          {
            error: "暗号化データが不正です。",
          },
          400,
        );
      }

      const passkey = await prisma.passkey.findFirst({
        where: {
          id: body.passkeyId,
          userID: userData.userID,
        },
        select: {
          id: true,
          name: true,
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

      const created = await prisma.prfCiphertext.create({
        data: {
          passkeyID: passkey.id,
          userID: userData.userID,
          label,
          ciphertext: body.ciphertext,
          iv: body.iv,
          tag: body.tag,
          associatedData: associatedData ?? null,
          version: body.version,
          prfInput: body.prfInput,
        },
      });

      return c.json(
        {
          entry: {
            id: created.id,
            passkeyId: created.passkeyID,
            passkeyName: passkey.name,
            label: created.label,
            ciphertext: created.ciphertext,
            iv: created.iv,
            tag: created.tag,
            associatedData: created.associatedData,
            version: created.version,
            createdAt: created.createdAt.toISOString(),
            prfInput: created.prfInput,
          },
        },
        201,
      );
    },
  )
  .post(
    "/entries",
    validator("json", (value, c) => {
      const parsed = z
        .object({
          passkeyId: z.string().trim().min(1).max(255).optional().nullable(),
          page: z.number().int().min(1).max(MAX_PRF_ENTRIES_PAGE).default(1),
          limit: z
            .number()
            .int()
            .min(1)
            .max(MAX_PRF_ENTRIES_LIMIT)
            .default(DEFAULT_PRF_ENTRIES_LIMIT),
        })
        .safeParse(value ?? {});
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

      const { passkeyId, page, limit } = c.req.valid("json");
      const passkeyFilter = passkeyId ?? undefined;

      const whereClause = {
        userID: userData.userID,
        ...(passkeyFilter ? { passkeyID: passkeyFilter } : {}),
      };

      const total = await prisma.prfCiphertext.count({
        where: whereClause,
      });

      const computedTotalPages = Math.ceil(total / limit);
      const cappedPage = computedTotalPages === 0 ? 1 : Math.min(page, computedTotalPages);
      const skip = (cappedPage - 1) * limit;

      const entries = await prisma.prfCiphertext.findMany({
        where: whereClause,
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip,
        include: {
          passkey: {
            select: {
              name: true,
            },
          },
        },
      });

      return c.json(
        {
          entries: entries.map((entry) => ({
            id: entry.id,
            passkeyId: entry.passkeyID,
            passkeyName: entry.passkey.name,
            label: entry.label,
            ciphertext: entry.ciphertext,
            iv: entry.iv,
            tag: entry.tag,
            associatedData: entry.associatedData,
            version: entry.version,
            createdAt: entry.createdAt.toISOString(),
            prfInput: entry.prfInput,
          })),
          pagination: {
            page: total === 0 ? 0 : cappedPage,
            limit,
            total,
            totalPages: total === 0 ? 0 : computedTotalPages,
          },
        },
        200,
      );
    },
  )
  .delete("/entries/:id", async (c) => {
    const userData = await loginSessionController.getUserData(c);
    if (!userData) {
      return c.json(
        {
          error: "ログインが必要です。",
        },
        401,
      );
    }

    const ciphertextId = c.req.param("id");
    if (!ciphertextId) {
      return c.json(
        {
          error: "IDが必要です。",
        },
        400,
      );
    }

    const ciphertext = await prisma.prfCiphertext.findUnique({
      where: {
        id: ciphertextId,
      },
      select: {
        id: true,
        userID: true,
        passkeyID: true,
      },
    });

    if (!ciphertext || ciphertext.userID !== userData.userID) {
      return c.json(
        {
          error: "暗号化データが見つかりません。",
        },
        404,
      );
    }

    await prisma.prfCiphertext.delete({
      where: {
        id: ciphertextId,
      },
    });

    return c.json(
      {
        deletedId: ciphertextId,
        passkeyId: ciphertext.passkeyID,
      },
      200,
    );
  });

export default prfApp;

export type PrfAppType = typeof prfRoutes;
