import { createClient, type RedisClientType } from "redis";
import { typedEnv } from "../../env.js";

let client: RedisClientType | null = null;
let shutdownHookRegistered = false;

export async function getRedis(): Promise<RedisClientType> {
  if (client && client.isOpen) return client;
  const url = typedEnv.REDIS_URL;
  client = createClient({
    url,
    socket: {
      reconnectStrategy: (retries) => {
        // 初回は即時、以降は指数だが上限5秒
        return retries === 0 ? 0 : Math.min(500 * 2 ** retries, 5_000);
      },
    },
  });
  client.on("error", (err) => {
    console.error("[redis] client error", err);
  });
  if (!client.isOpen) await client.connect();
  try {
    await client.ping();
    console.info("[redis] connected");
  } catch (e) {
    console.warn("[redis] ping failed after connect", e);
  }

  if (!shutdownHookRegistered) {
    shutdownHookRegistered = true;
    const graceful = async () => {
      if (client && client.isOpen) {
        try {
          await client.quit();
          console.info("[redis] client closed");
        } catch (e) {
          console.warn("[redis] error during quit", e);
        }
      }
    };
    process.on("SIGTERM", graceful);
    process.on("SIGINT", graceful);
  }
  return client;
}
