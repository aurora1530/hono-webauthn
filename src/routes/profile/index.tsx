import { Hono } from 'hono';
import Profile from '../../components/profile/Profile.tsx';
import { loginSessionController } from '../../lib/auth/loginSession.ts';

const profileApp = new Hono();

profileApp.get('/', async (c) => {
  const isLoginedIn = !!(await loginSessionController.getUserData(c));
  if (!isLoginedIn) {
    return c.redirect('/auth/login');
  }

  return c.render(<Profile />, {
    title: 'プロフィール',
  });
});

export default profileApp;