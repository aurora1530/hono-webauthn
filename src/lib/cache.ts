interface InMemoryCache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  delete(key: string): void;
}

interface InMemoryCacheOptions {
  ttlMs: number;
}

export const createInMemoryCache = <T>(options: InMemoryCacheOptions): InMemoryCache<T> => {
  const cache = new Map<string, { value: T; expiresAt: number }>();

  return {
    get(key: string): T | undefined {
      const entry = cache.get(key);
      if (entry) {
        if (entry.expiresAt > Date.now()) {
          return entry.value;
        } else {
          cache.delete(key);
        }
      }
      return undefined;
    },
    set(key: string, value: T): void {
      cache.set(key, { value, expiresAt: Date.now() + options.ttlMs });
    },
    delete(key: string): void {
      cache.delete(key);
    },
  };
};
