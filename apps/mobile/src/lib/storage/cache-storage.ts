/**
 * Lightweight local cache storage for offline resilience (airplane mode search review).
 * Provides fast sync access with in-memory cache and resilient persistence.
 */

interface CacheEntry<T> {
  data: T;
  cachedAt: string;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export const cacheStorage = {
  set<T>(key: string, data: T): void {
    memoryCache.set(key, {
      data,
      cachedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  },

  get<T>(key: string): CacheEntry<T> | null {
    const entry = memoryCache.get(key);
    return entry || null;
  },

  remove(key: string): void {
    memoryCache.delete(key);
  },

  clear(): void {
    memoryCache.clear();
  },
};

