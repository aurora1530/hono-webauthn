import { Hono } from 'hono';
import AccountRegisterForm from '../../components/auth/AccountRegisterForm.js';
import { validator } from 'hono/validator';
import prisma from '../../prisma.js';
import webauthnApp from './webauthn/index.js';
import LoginForm from '../../components/auth/LoginForm.js';
import AuthPage from '../../components/auth/AuthPage.js';
import authPageRenderer from './renderer.js';
import PasskeyManagement from '../../components/auth/PasskeyManagemet.js';
import { loginSessionController } from '../../lib/auth/loginSession.js';
import { webauthnSessionController } from '../../lib/auth/webauthnSession.js';
import z from 'zod';

const authApp = new Hono();

authApp.route('/webauthn', webauthnApp);

const authAppRoutes = authApp
  .use(authPageRenderer)
  .get('/', (c)=>{
    return c.render(<AuthPage />, {
      title: 'WebAuthn Demo',
    })
  })
  .get('/logout', async (c) => {
    await loginSessionController.setLoggedOut(c);
    return c.redirect('/');
  })
  .get('/login', (c) => {
    return c.render(<LoginForm />, {
      title: 'ログイン',
    });
  })
  .get('/register', (c) => {
    return c.render(<AccountRegisterForm />, {
      title: 'アカウント登録',
    });
  })
  .post(
    '/register',
    validator('json', (value, c) => {
      const UsernameSchema = z
        .string()
        .trim()
        .min(1)
        .max(64)
        .regex(/^[a-zA-Z0-9]+$/, { message: 'ユーザー名は半角英数字のみ使用できます。' });
      const parsed = z.object({ username: UsernameSchema }).safeParse(value);
      if (!parsed.success) {
        return c.json(
          {
            error: 'ユーザー名は1〜64文字、半角英数字のみ使用できます。',
          },
          400
        );
      }

      return parsed.data;
    }),
    async (c) => {
      const { username } = c.req.valid('json');

      const alreadyExists = await prisma.user.findUnique({
        where: {
          name: username,
        },
      });

      if (alreadyExists) {
        return c.json(
          {
            error: 'ユーザー名が既に存在します。',
          },
          400
        );
      }

      await webauthnSessionController.registration.generate.initialize(c, {
        username: username,
      });

      return c.json({}, 200);
    }
  )
  .get('/passkey-management', async (c) => {
    const userData = await loginSessionController.getUserData(c);
    if (!userData) {
      return c.redirect('/auth/login');
    }

    const passkeys = await prisma.passkey.findMany({
      where: {
        userID: userData.userID,
      },
    });

    return c.render(<PasskeyManagement passkeys={passkeys} currentPasskeyID={userData.usedPasskeyID} />, { title: 'パスキー管理' });
  });

export default authApp;

export type AuthAppType = typeof authAppRoutes;