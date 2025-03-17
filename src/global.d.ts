import type {} from 'hono';
import type { LoginSession } from './session.ts';

declare module 'hono' {
  interface ContextVariableMap {
    loginSession: LoginSession;
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
