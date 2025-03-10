import { Hono } from 'hono';
import authApp from './auth/index.js';

const routerRootApp = new Hono();

routerRootApp.route('/auth', authApp);

routerRootApp.get('/', (c) => {
  return c.render('トップページ', {
    title: 'トップページ',
  });
});
export default routerRootApp;
