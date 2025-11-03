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
import { origin, rpID, rpName } from '../../../constant.js';
import { webauthnSessionController } from '../../../lib/auth/webauthnSession.js';
import { isAuthenticatorTransportFuture } from '../../../lib/auth/transport.js';
import { aaguidToNameAndIcon } from '../../../lib/auth/aaguid/parse.js';
import { validator } from 'hono/validator';
import { loginSessionController } from '../../../lib/auth/loginSession.js';
import z from 'zod';
import { reauthSessionController } from '../../../lib/auth/reauthSession.js';

const webauthnApp = new Hono();

webauthnApp
  .get('/registration/generate', async (c) => {
    const loginSessionData = await loginSessionController.getUserData(c);
    const username =
      loginSessionData?.username ??
      (await webauthnSessionController.registration.generate.extractSessionData(c))?.username;

    if (!username) {
      return c.json(
        {
          success: false,
          message: 'セッションが不正です。登録をやり直してください。',
        },
        401
      );
    }

    // ログイン済みユーザであれば、これはパスキーを追加するリクエストなので、既存のパスキーを取得する
    const userID = loginSessionData?.userID;
    const savedPasskeys: Passkey[] = userID
      ? await prisma.passkey.findMany({
          where: {
            userID: userID,
          },
        })
      : [];

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
      });

    await webauthnSessionController.registration.verify.initialize(c, options);

    return c.json(options);
  })
  .post('/registration/verify', async (c) => {
    const webauthnRegistrationSession =
      await webauthnSessionController.registration.verify.extractSessionData(c);

    if (!webauthnRegistrationSession?.user || !webauthnRegistrationSession.challenge) {
      return c.json(
        {
          success: false,
          message: 'セッションが不正です。登録をやり直してください。',
        },
        401
      );
    }

    const body = await c.req.json();
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
          success: false,
          message: '登録に失敗しました。もう一度やり直してください。',
        },
        400
      );
    }

    const { verified, registrationInfo } = verification;

    if (!verified || !registrationInfo) {
      return c.json(
        {
          success: false,
          message: '登録に失敗しました。もう一度やり直してください。',
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

    const userAgent = c.req.header('User-Agent') || '';

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
        userAgent,
      },
    });

    return c.json({
      success: true,
    });
  })
  .get('/authentication/generate', async (c) => {
    if (await loginSessionController.getUserData(c)) {
      return c.json({
        success: true,
      });
    }

    const options: PublicKeyCredentialRequestOptionsJSON =
      await generateAuthenticationOptions({
        rpID,
      });

    await webauthnSessionController.authentication.verify.initialize(c, options);

    return c.json(options);
  })
  .post('/authentication/verify', async (c) => {
    const { challenge: savedChallenge } =
      (await webauthnSessionController.authentication.verify.extractSessionData(c)) || {};
    if (!savedChallenge) {
      return c.json(
        {
          success: false,
          message: 'セッションが不正です。認証をやり直してください',
        },
        401
      );
    }

    const body = await c.req.json();

    const savedPasskey = await prisma.passkey.findFirst({
      where: {
        id: body?.id,
      },
    });

    if (!savedPasskey) {
      return c.json(
        {
          success: false,
          message: '認証に失敗しました。もう一度やり直してください',
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
          success: false,
          message: '認証に失敗しました。もう一度やり直してください',
        },
        400
      );
    }

    const { verified, authenticationInfo } = verification;
    if (!verified || !authenticationInfo) {
      return c.json(
        {
          success: false,
          message: '認証に失敗しました。もう一度やり直してください',
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
          success: false,
          message: '認証に失敗しました。もう一度やり直してください',
        },
        400
      );
    }

    await loginSessionController.setLoggedIn(c, {
      userID: user.id,
      username: user.name,
      usedPasskeyID: savedPasskey.id,
    });

    return c.json({
      success: true,
    });
  })
  .get('/reauthentication/generate', async (c) => {
    const userData = await loginSessionController.getUserData(c);
    if (!userData) {
      return c.redirect('/auth/login');
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

    return c.json(options);
  })
  .post('/reauthentication/verify', async (c) => {
    const { challenge: savedChallenge } =
      (await webauthnSessionController.reauthentication.verify.extractSessionData(c)) ||
      {};
    if (!savedChallenge) {
      return c.json(
        {
          success: false,
          message: 'セッションが不正です。認証をやり直してください',
        },
        401
      );
    }

    const loginSessionData = await loginSessionController.getUserData(c);
    if (!loginSessionData) {
      return c.json(
        {
          success: false,
          message: 'ログインが必要です。',
        },
        401
      );
    }

    const body = await c.req.json();

    const savedPasskey = await prisma.passkey.findFirst({
      where: {
        id: body?.id,
      },
    });

    if (!savedPasskey) {
      return c.json(
        {
          success: false,
          message: '認証に失敗しました。もう一度やり直してください',
        },
        400
      );
    }

    if(loginSessionData.userID !== savedPasskey.userID) {
      return c.json(
        {
          success: false,
          message: '認証に失敗しました。もう一度やり直してください',
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
          success: false,
          message: '認証に失敗しました。もう一度やり直してください',
        },
        400
      );
    }

    const { verified, authenticationInfo } = verification;
    if (!verified || !authenticationInfo) {
      return c.json(
        {
          success: false,
          message: '認証に失敗しました。もう一度やり直してください',
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

    await reauthSessionController.initialize(c, {
      userId: loginSessionData.userID,
    });

    return c.json({
      success: true,
    });
  })
  .post(
    '/change-passkey-name',
    validator('json', (value, c) => {
      const parsed = z.object({
        passkeyId: z.string(),
        newName: z.string(),
      }).safeParse(value);
      if (!parsed.success) {
        return c.json(
          {
            success: false,
            message: 'リクエストが不正です。',
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
            success: false,
            message: 'ログインが必要です。',
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
            success: false,
            message: 'パスキーが見つかりません。',
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

      return c.json({
        success: true,
      });
    }
  )
  .post(
    '/delete-passkey',
    validator('json', (value, c) => {
      const parsed = z.object({ passkeyId: z.string() }).safeParse(value);
      if (!parsed.success) {
        return c.json(
          {
            success: false,
            message: 'リクエストが不正です。',
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
            success: false,
            message: 'ログインが必要です。',
          },
          401
        );
      }

      const { passkeyId } = c.req.valid('json');

      const targetPasskeyIsCurrentUsed = userData.usedPasskeyID === passkeyId;
      if (targetPasskeyIsCurrentUsed) {
        return c.json(
          {
            success: false,
            message: '現在使用中のパスキーは削除できません。',
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
            success: false,
            message: '削除後に最低でも1つのパスキーを保持する必要があります。',
          },
          400
        );
      }

      try {
        const deletedPasskey = await prisma.passkey.delete({
          where: {
            id: passkeyId,
            userID: userData.userID,
          },
        });
        return c.json({
          success: true,
          message: `パスキー ${deletedPasskey.name} を削除しました。`,
        });
      } catch (e) {
        console.error(e);
        return c.json(
          {
            success: false,
            message: 'パスキーの削除に失敗しました。',
          },
          500
        );
      }
    }
  );

export default webauthnApp;
