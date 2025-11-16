import { Hono } from 'hono';
import authApp from './auth/index.js';
import profileApp from './profile/index.tsx';

const routerRootApp = new Hono();

routerRootApp.route('/auth', authApp);
routerRootApp.route('/profile', profileApp);

routerRootApp.get('/', (c) => {
  return c.render('トップページ', {
    title: 'トップページ',
  });
});
export default routerRootApp;
