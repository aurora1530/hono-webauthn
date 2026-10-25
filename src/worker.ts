import { env } from "cloudflare:workers";
import { createApp } from "./app.js";
import { createPrismaClient, prismaContext } from "./prisma.js";

const app = createApp(async (c) => {
  const url = new URL(c.req.url);
  url.pathname = url.pathname.slice("/public".length);
  const response = await env.ASSETS.fetch(new Request(url, c.req.raw));
  return new Response(response.body, response);
});

export default {
  async fetch(request, env, ctx) {
    if (
      (request.method === "GET" || request.method === "HEAD") &&
      new URL(request.url).pathname.startsWith("/public/")
    ) {
      return app.fetch(request, env, ctx);
    }
    const prisma = createPrismaClient(env.HYPERDRIVE.connectionString);
    try {
      return await prismaContext.run(prisma, () => app.fetch(request, env, ctx));
    } finally {
      ctx.waitUntil(prisma.$disconnect());
    }
  },
} satisfies ExportedHandler<Cloudflare.Env>;
