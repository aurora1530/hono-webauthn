import type {} from "hono";

declare module "hono" {
  interface ContextVariableMap {}

  type ContextRenderer = (
    content: string | Promise<string>,
    props: {
      title: string;
    },
  ) => Response;
}
