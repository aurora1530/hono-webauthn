import { Hono } from 'hono';
import AccountRegisterForm from '../../components/auth/AccountRegisterForm.js';
import { validator } from 'hono/validator';
import prisma from '../../prisma.js';
import webauthnApp from './webauthn/index.js';
import LoginForm from '../../components/auth/LoginForm.js';
import WebAuthnSession from '../../lib/auth/webauthnSession.js';
import authPageRenderer from './renderer.js';

const authApp = new Hono();

authApp.route('/webauthn', webauthnApp);

authApp
  .use(authPageRenderer)
  .get('/logout', async (c) => {
    const loginSession = c.get('loginSession');
    loginSession.destroy();
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

      await WebAuthnSession.setInitialRegistrationSession(c,username)

      return c.json({
        success: true,
      });
    }
  );

export default authApp;
