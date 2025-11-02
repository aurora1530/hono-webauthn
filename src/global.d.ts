import type {} from 'hono';
import type { LoginSessionStore } from './lib/auth/loginSession.ts';
import type { SessionID } from './lib/session.ts';

declare module 'hono' {
  interface ContextVariableMap {
    loginSessionID: SessionID;
    loginSessionStore: LoginSessionStore;
  }

  interface ContextRenderer {
    (
      content: string | Promise<string>,
      props: {
        title: string;
      }
    ): Response;
  }
}
