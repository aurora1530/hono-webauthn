export type RedisSetOptions = { EX: number; XX?: boolean };

export interface RedisTransaction {
  incr(key: string): RedisTransaction;
  expire(key: string, seconds: number, mode: "NX"): RedisTransaction;
  exec(): Promise<unknown[]>;
}

export interface RedisStore {
  readonly isReady: boolean;
  get(key: string): Promise<string | null>;
  getDel(key: string): Promise<string | null>;
  set(key: string, value: string, options: RedisSetOptions): Promise<string | null>;
  expire(key: string, seconds: number): Promise<number>;
  del(key: string): Promise<number>;
  ttl(key: string): Promise<number>;
  multi(): RedisTransaction;
}
