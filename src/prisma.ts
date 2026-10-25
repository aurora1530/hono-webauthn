import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export const prismaContext = new AsyncLocalStorage<PrismaClient>();
let nodeClient: PrismaClient | undefined;

export function createPrismaClient(connectionString: string) {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 1, connectionTimeoutMillis: 10_000 }),
  });
}

// Workersではリクエストごとに生成した接続だけを使い、別リクエストへ持ち越さない。
const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    let client = prismaContext.getStore();
    if (!client) {
      if (process.env.CLOUDFLARE_WORKERS === "true") {
        throw new Error("Prisma request context is missing");
      }
      nodeClient ??= createPrismaClient(process.env.DATABASE_URL ?? "");
      client = nodeClient;
    }
    const value = Reflect.get(client, property);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;
