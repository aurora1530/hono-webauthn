import type { Passkey } from '@prisma/client';
import { Hono } from 'hono';
import prisma from '../../../prisma.js';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import { webauthnSessionController } from '../../../lib/auth/webauthnSession.js';
import { isAuthenticatorTransportFuture } from '../../../lib/auth/transport.js';
import { aaguidToNameAndIcon } from '../../../lib/auth/aaguid/parse.js';
import { validator } from 'hono/validator';
import { loginSessionController } from '../../../lib/auth/loginSession.js';
import z from 'zod';
import { reauthSessionController } from '../../../lib/auth/reauthSession.js';
import inferClientPlatform from '../../../lib/auth/inferClientPlatform.js';
import { addHistory } from '../../../lib/auth/history.ts';
import { MAX_PASSKEYS_PER_USER, origin, rpID, rpName } from './constant.ts';

const webauthnApp = new Hono();

const webAuthnRoutes = webauthnApp
  .get('/registration/generate', async (c) => {
    const loginSessionData = await loginSessionController.getUserData(c);
    const username =
      loginSessionData?.username ??
      (await webauthnSessionController.registration.generate.extractSessionData(c))?.username;

    if (!username) {
      return c.json(
        {
          error: 'セッションが不正です。登録をやり直してください。',
        },
        401
      );
    }

    if (loginSessionData) {
      // ログイン済みであれば、再認証がなされているかのチェック（本来の手順を済ませていれば適切に再認証がされているはずなので、単にエラーを返すだけで良い）
      const reauthData = await reauthSessionController.extractSessionData(c);
      if (loginSessionData.userID !== reauthData?.userId) {
        return c.json(
          {
            error: '再認証が必要です。再度認証を行ってください。',
          },
          401
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
        400
      );
    }

    const savedWebAuthnUserId = savedPasskeys[0]?.webauthnUserID;

    const options: PublicKeyCredentialCreationOptionsJSON =
      await generateRegistrationOptions({
        rpID,
        rpName,
        userName: username,
        userDisplayName: username,
        userID: savedWebAuthnUserId
          ? isoUint8Array.fromUTF8String(savedWebAuthnUserId)
          : undefined,
        excludeCredentials: savedPasskeys.map((p) => {
          return {
            id: p.id,
            type: 'public-key',
          };
        }),
        authenticatorSelection: {
          residentKey: 'required',
          requireResidentKey: true,
        }
      });

    await webauthnSessionController.registration.verify.initialize(c, options);

    return c.json(options, 200);
  })
  .post(
    '/registration/verify',
    validator('json', (value, c) => {
      const parsed = z.object({ body: z.any() }).safeParse(value);
      if (!parsed.success) {
        return c.json(
          {
            error: 'リクエストが不正です。',
          },
          400
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
            error: 'セッションが不正です。作成をやり直してください。',
          },
          401
        );
      }

      const body = c.req.valid('json').body;
      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: body,
          expectedChallenge: webauthnRegistrationSession.challenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
        });
      } catch (e) {
        console.error(e);
        return c.json(
          {
            error: '作成に失敗しました。もう一度やり直してください。',
          },
          400
        );
      }

      const { verified, registrationInfo } = verification;

      if (!verified || !registrationInfo) {
        return c.json(
          {
            error: '作成に失敗しました。もう一度やり直してください。',
          },
          400
        );
      }

      // 新規作成ならユーザを作成し、既存ユーザならセッションからIDを取得
      let userID = (await loginSessionController.getUserData(c))?.userID;
      if (!userID) {
        // 存在しないユーザ名であることは既に確認済み
        const user = await prisma.user.create({
          data: {
            name: webauthnRegistrationSession.user.name,
          },
        });
        userID = user.id;
      }

      const { credential, credentialDeviceType, credentialBackedUp, aaguid } =
        registrationInfo;

      const passkeyName = aaguidToNameAndIcon(aaguid)?.name ?? 'パスキー';

      const { os, browser } = inferClientPlatform(c.req.raw.headers);

      await prisma.passkey.create({
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

      return c.json({}, 200);
    }
  )
  .get('/authentication/generate', async (c) => {
    const options: PublicKeyCredentialRequestOptionsJSON =
      await generateAuthenticationOptions({
        rpID,
      });

    await webauthnSessionController.authentication.verify.initialize(c, options);

    return c.json(options, 200);
  })
  .post('/authentication/verify', validator('json', (value, c) => {
    const parsed = z.object({ body: z.any() }).safeParse(value);
    if (!parsed.success) {
      return c.json(
        {
          error: 'リクエストが不正です。',
        },
        400
      );
    }

    return parsed.data;
  }), async (c) => {
    const { challenge: savedChallenge } =
      (await webauthnSessionController.authentication.verify.extractSessionData(c)) || {};
    if (!savedChallenge) {
      return c.json(
        {
          error: 'セッションが不正です。認証をやり直してください',
        },
        401
      );
    }

    const body = c.req.valid('json').body;

    const savedPasskey = await prisma.passkey.findFirst({
      where: {
        id: body?.id,
      },
    });

    if (!savedPasskey) {
      return c.json(
        {
          error: '認証に失敗しました。もう一度やり直してください',
        },
        400
      );
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: savedChallenge,
        expectedOrigin: origin,
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
          error: '認証に失敗しました。もう一度やり直してください',
        },
        400
      );
    }

    const { verified, authenticationInfo } = verification;
    if (!verified || !authenticationInfo) {
      return c.json(
        {
          error: '認証に失敗しました。もう一度やり直してください',
        },
        400
      );
    }

    await prisma.passkey.update({
      where: {
        id: savedPasskey.id,
      },
      data: {
        counter: authenticationInfo.newCounter,
      },
    });

    // 認証したパスキーレコードからユーザ情報を取得
    const user = await prisma.user.findUnique({
      where: {
        id: savedPasskey.userID,
      },
    });

    if (!user) {
      return c.json(
        {
          error: '認証に失敗しました。もう一度やり直してください',
        },
        400
      );
    }

    await addHistory({
      passkeyId: savedPasskey.id,
      ...inferClientPlatform(c.req.raw.headers),
    });

    await loginSessionController.setLoggedIn(c, {
      userID: user.id,
      username: user.name,
      usedPasskeyID: savedPasskey.id,
    });

    return c.json({}, 200);
  })
  .get('/reauthentication/generate', async (c) => {
    const userData = await loginSessionController.getUserData(c);
    if (!userData) {
      return c.json(
        {
          error: '再認証にはログインが必要です。',
        },
        401
      );
    }

    const savedPasskey = await prisma.passkey.findMany({
      where: {
        userID: userData.userID,
      },
    });

    const options: PublicKeyCredentialRequestOptionsJSON =
      await generateAuthenticationOptions({
        rpID,
        allowCredentials: savedPasskey.map((p) => ({
          id: p.id,
          transports: p.transports.filter(isAuthenticatorTransportFuture),
        })),
      });

    await webauthnSessionController.reauthentication.verify.initialize(c, options);

    return c.json(options, 200);
  })
  .post('/reauthentication/verify',
    validator('json', (value, c) => {
      const parsed = z.object({ body: z.any() }).safeParse(value);
      if (!parsed.success) {
        return c.json(
          {
            error: 'リクエストが不正です。',
          },
          400
        );
      }

      return parsed.data;
    }),
    async (c) => {
    const { challenge: savedChallenge } =
      (await webauthnSessionController.reauthentication.verify.extractSessionData(c)) ||
      {};
    if (!savedChallenge) {
      return c.json(
        {
          error: 'セッションが不正です。認証をやり直してください',
        },
        401
      );
    }

    const loginSessionData = await loginSessionController.getUserData(c);
    if (!loginSessionData) {
      return c.json(
        {
          error: 'ログインが必要です。',
        },
        401
      );
    }

    const body = c.req.valid('json').body;

    const savedPasskey = await prisma.passkey.findFirst({
      where: {
        id: body?.id,
      },
    });

    if (!savedPasskey) {
      return c.json(
        {
          error: '認証に失敗しました。もう一度やり直してください',
        },
        400
      );
    }

    if (loginSessionData.userID !== savedPasskey.userID) {
      return c.json(
        {
          error: '認証に失敗しました。もう一度やり直してください',
        },
        400
      );
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: savedChallenge,
        expectedOrigin: origin,
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
          error: '認証に失敗しました。もう一度やり直してください',
        },
        400
      );
    }

    const { verified, authenticationInfo } = verification;
    if (!verified || !authenticationInfo) {
      return c.json(
        {
          error: '認証に失敗しました。もう一度やり直してください',
        },
        400
      );
    }

    await prisma.passkey.update({
      where: {
        id: savedPasskey.id,
      },
      data: {
        counter: authenticationInfo.newCounter,
      },
    });

    await addHistory({
      passkeyId: savedPasskey.id,
      ...inferClientPlatform(c.req.raw.headers),
    });

    await reauthSessionController.initialize(c, {
      userId: loginSessionData.userID,
    });

    return c.json({}, 200);
  })
  .post(
    '/change-passkey-name',
    validator('json', (value, c) => {
      const parsed = z
        .object({
          passkeyId: z.string(),
          newName: z.string().trim().min(1).max(50),
        })
        .safeParse(value);
      if (!parsed.success) {
        if(parsed.error.issues.some(i=>i.code === 'too_small' || i.code === 'too_big')){
          return c.json(
            {
              error: 'パスキー名は1文字以上50文字以下である必要があります。',
            },
            400
          );
        }
        return c.json(
          {
            error: 'リクエストが不正です。',
          },
          400
        );
      }

      return parsed.data;
    }),
    async (c) => {
      const userData = await loginSessionController.getUserData(c);
      if (!userData) {
        return c.json(
          {
            error: 'ログインが必要です。',
          },
          401
        );
      }

      const { passkeyId, newName } = c.req.valid('json');

      const passkey = await prisma.passkey.findUnique({
        where: {
          id: passkeyId,
        },
      });

      if (!passkey || passkey.userID !== userData.userID) {
        return c.json(
          {
            error: 'パスキーが見つかりません。',
          },
          404
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
    }
  )
  .post(
    '/delete-passkey',
    validator('json', (value, c) => {
      const parsed = z.object({ passkeyId: z.string() }).safeParse(value);
      if (!parsed.success) {
        return c.json(
          {
            error: 'リクエストが不正です。',
          },
          400
        );
      }

      return parsed.data;
    }),
    async (c) => {
      const userData = await loginSessionController.getUserData(c);
      if (!userData) {
        return c.json(
          {
            error: 'ログインが必要です。',
          },
          401
        );
      }

      const reauthData = await reauthSessionController.extractSessionData(c);
      if (userData.userID !== reauthData?.userId) {
        return c.json(
          {
            error: '再認証が必要です。再度認証を行ってください。',
          },
          401
        );
      }

      const { passkeyId } = c.req.valid('json');

      const targetPasskeyIsCurrentUsed = userData.usedPasskeyID === passkeyId;
      if (targetPasskeyIsCurrentUsed) {
        return c.json(
          {
            error: '現在使用中のパスキーは削除できません。',
          },
          400
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
            error: '削除後に最低でも1つのパスキーを保持する必要があります。',
          },
          400
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
        return c.json({
          passkeyName: deletedPasskey.name,
        }, 200);
      } catch (e) {
        console.error(e);
        return c.json(
          {
            error: 'パスキーの削除に失敗しました。',
          },
          500

        );
      }
    }
  );

export default webauthnApp;

export type WebAuthnAppType = typeof webAuthnRoutes;
