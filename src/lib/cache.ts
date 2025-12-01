interface InMemoryCache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  delete(key: string): void;
}

interface InMemoryCacheOptions {
  ttlMs: number;
}

type CacheEntry<T> = {
  value: T;
  timeout: ReturnType<typeof setTimeout>;
};

export const createInMemoryCache = <T>(options: InMemoryCacheOptions): InMemoryCache<T> => {
  const cache = new Map<string, CacheEntry<T>>();

  const scheduleEviction = (key: string) => {
    return setTimeout(() => {
      cache.delete(key);
    }, options.ttlMs);
  };

  const upsertEntry = (key: string, value: T) => {
    const existing = cache.get(key);
    if (existing) {
      clearTimeout(existing.timeout);
    }
    cache.set(key, { value, timeout: scheduleEviction(key) });
  };

  return {
    get(key: string): T | undefined {
      const entry = cache.get(key);
      return entry ? entry.value : undefined;
    },
    set(key: string, value: T): void {
      upsertEntry(key, value);
    },
    delete(key: string): void {
      const entry = cache.get(key);
      if (entry) {
        clearTimeout(entry.timeout);
        cache.delete(key);
      }
    },
  };
};
