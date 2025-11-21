import type {} from "hono";

declare module "hono" {
  interface ContextVariableMap {}

  interface ContextRenderer {
    (
      content: string | Promise<string>,
      props: {
        title: string;
      },
    ): Response;
  }
}
