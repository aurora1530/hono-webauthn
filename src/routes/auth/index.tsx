import { Hono } from 'hono';
import AccountRegisterForm from '../../components/auth/AccountRegisterForm.js';
import { validator } from 'hono/validator';
import prisma from '../../prisma.js';
import webauthnApp from './webauthn/index.js';

const authApp = new Hono();

authApp.route('/webauthn', webauthnApp);

authApp
  .get('/logout', async (c) => {
    const session = c.get('session');
    session.destroy();
    return c.redirect('/');
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

      const session = c.get('session');
      session.username = username;
      await session.save();

      return c.json({
        success: true,
      });
    }
  );

export default authApp;
