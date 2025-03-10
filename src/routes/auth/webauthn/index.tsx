import type { Passkey } from '@prisma/client';
import { Hono } from 'hono';
import prisma from '../../../prisma.js';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type PublicKeyCredentialCreationOptionsJSON,
} from '@simplewebauthn/server';
import { origin, rpID, rpName } from '../../../constant.js';
import WebAuthnSession from '../../../lib/auth/webauthnSession.js';

const webauthnApp = new Hono();

webauthnApp
  .get('/registration/generate', async (c) => {
    const session = c.get('session');

    const userName = session.username;
    if (!userName) {
      return c.json(
        {
          success: false,
          message: 'セッションが不正です。登録をやり直してください。',
        },
        401
      );
    }

    // ログイン済みユーザであれば、これは新たなパスキー登録リクエストなので、既存のパスキーを取得する
    const userID = session.isLogin ? session.userID : undefined;
    const savedPasskeys: Passkey[] = userID
      ? await prisma.passkey.findMany({
          where: {
            userID: userID,
          },
        })
      : [];

    const options: PublicKeyCredentialCreationOptionsJSON =
      await generateRegistrationOptions({
        rpID,
        rpName,
        userName,
        excludeCredentials: savedPasskeys.map((p) => {
          return {
            id: p.id,
            type: 'public-key',
          };
        }),
      });

    WebAuthnSession.setRegistrationSession(userName, options);

    return c.json(options);
  })
  .post('/registration/verify', async (c) => {
    const session = c.get('session');
    const userName = session.username;

    if (!userName) {
      return c.json(
        {
          success: false,
          message: 'セッションが不正です。登録をやり直してください。',
        },
        401
      );
    }

    const currentOptions = WebAuthnSession.getRegistrationSession(userName);
    if (!currentOptions) {
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
        expectedChallenge: currentOptions.challenge,
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
    let userID: string;
    if (session.isLogin) {
      userID = session.userID;
    } else {
      const user = await prisma.user.create({
        data: {
          name: userName,
        },
      });
      userID = user.id;
    }

    const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;

    await prisma.passkey.create({
      data: {
        id: credential.id,
        webauthnUserID: currentOptions.user.id,
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
  });

export default webauthnApp;
