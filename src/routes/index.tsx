import { Hono } from 'hono';
import authApp from './auth/index.js';

const routerRootApp = new Hono();

routerRootApp.route('/auth', authApp);

export default routerRootApp;
