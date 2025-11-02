import { createClient, type RedisClientType } from 'redis';

let client: RedisClientType | null = null;

export async function getRedis(): Promise<RedisClientType> {
  if (client && client.isOpen) return client;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is not defined in environment variables');
  client = createClient({ url });
  client.on('error', (err) => {
    console.error('[redis] client error', err);
  });
  if (!client.isOpen) await client.connect();
  return client;
}

