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

const authApp = new Hono();

authApp.route('/webauthn', webauthnApp);

authApp
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
      const username = value['username'];
      if (!username || typeof username !== 'string') {
        return c.json(
          {
            success: false,
            message: 'ユーザー名が不正です。',
          },
          400
        );
      }

      return {
        username: username,
      };
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
            success: false,
            message: 'ユーザー名が既に存在します。',
          },
          400
        );
      }

      await webauthnSessionController.registration.generate.initialize(c, {
        username: username,
      });

      return c.json({
        success: true,
      });
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

    return c.render(<PasskeyManagement passkeys={passkeys} />, { title: 'パスキー管理' });
  });

export default authApp;
