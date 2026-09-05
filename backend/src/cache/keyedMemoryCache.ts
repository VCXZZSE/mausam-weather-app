type CacheEntry<T,> = {
  value: T
  expiresAt: number
}

/**
 * Per-key variant of MemoryCache — required once the weather/AQI routes
 * became location-aware (see backend-v0.2 handoff §5): a single shared
 * cache entry would otherwise return one user's cached weather to a
 * different location. Each key (typically a rounded coordinate pair, see
 * types/location.ts coordinateCacheKey) gets its own TTL and its own
 * last-known-good fallback — a stale value for key A is never returned
 * for key B.
 */
export class KeyedMemoryCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>()
  private readonly ttlMs: number

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs
  }

  private isFresh(key: string): boolean {
    const entry = this.entries.get(key)
    return entry !== undefined && entry.expiresAt > Date.now()
  }

  getLastGood(key: string): T | undefined {
    return this.entries.get(key)?.value
  }

  async getOrFetch(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.isFresh(key)) {
      return this.entries.get(key)!.value
    }

    try {
      const value = await fetcher()
      this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs })
      return value
    } catch (error) {
      const stale = this.entries.get(key)
      if (stale !== undefined) {
        return stale.value
      }
      throw error
    }
  }
}
