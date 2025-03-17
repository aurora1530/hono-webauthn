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
import WebAuthnSession from '../../../lib/auth/webauthnSession.js';
import { isAuthenticatorTransportFuture } from '../../../lib/auth/transport.js';

const webauthnApp = new Hono();

webauthnApp
  .get('/registration/generate', async (c) => {
    const session = c.get('session');

    const userName = session.isLogin
      ? session.username
      : (await WebAuthnSession.getInitialRegistrationSession(c)).username;
    if (!userName) {
      return c.json(
        {
          success: false,
          message: 'セッションが不正です。登録をやり直してください。',
        },
        401
      );
    }

    // ログイン済みユーザであれば、これはパスキーを追加するリクエストなので、既存のパスキーを取得する
    const userID = session.isLogin ? session.userID : undefined;
    const savedPasskeys: Passkey[] = userID
      ? await prisma.passkey.findMany({
          where: {
            userID: userID,
          },
        })
      : [];

    const savedWebAuthnUserId =
      savedPasskeys.length > 0 ? savedPasskeys[0].webauthnUserID : undefined;

    const options: PublicKeyCredentialCreationOptionsJSON =
      await generateRegistrationOptions({
        rpID,
        rpName,
        userName,
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

    await WebAuthnSession.setRegistrationSession(c, options);

    return c.json(options);
  })
  .post('/registration/verify', async (c) => {
    const session = c.get('session');
    const webauthnRegistrationSession = await WebAuthnSession.getRegistrationSession(c);

    if (
      !webauthnRegistrationSession.user ||
      !webauthnRegistrationSession.challenge
    ) {
      session.destroy();
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
      session.destroy();
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
    let userID: string;
    if (session.isLogin) {
      userID = session.userID;
    } else {
      // 存在しないユーザ名であることは既に確認済み
      const user = await prisma.user.create({
        data: {
          name: webauthnRegistrationSession.user.name,
        },
      });
      userID = user.id;
    }

    const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;

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
      },
    });

    return c.json({
      success: true,
    });
  })
  .get('/authentication/generate', async (c) => {
    const session = c.get('session');
    if (session.isLogin) {
      return c.json({
        success: true,
      });
    }

    const options: PublicKeyCredentialRequestOptionsJSON =
      await generateAuthenticationOptions({
        rpID,
      });

    await WebAuthnSession.setAuthenticationSession(c, options);

    return c.json(options);
  })
  .post('/authentication/verify', async (c) => {
    const session = c.get('session');

    const { challenge: savedChallenge } = await WebAuthnSession.getAuthenticationSession(
      c
    );
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
        id: body.id,
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

    if (!session.isLogin) {
      // @ts-ignore
      session.isLogin = true;
      // @ts-ignore
      session.userID = user.id;
      // @ts-ignore
      session.username = user.name;
    }

    await session.save();

    return c.json({
      success: true,
    });
  });

export default webauthnApp;
