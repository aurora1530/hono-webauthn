import type {} from 'hono';
import type { LoginSessionService } from './lib/auth/loginSession.ts';
import type { SessionID } from './lib/session.ts';

declare module 'hono' {
  interface ContextVariableMap {
    loginSessionID: SessionID;
    loginSessionStore: LoginSessionService;
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
