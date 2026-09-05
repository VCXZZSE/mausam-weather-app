type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class MemoryCache<T> {
  private entry: CacheEntry<T> | undefined
  private readonly ttlMs: number

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs
  }

  private isFresh(): boolean {
    return this.entry !== undefined && this.entry.expiresAt > Date.now()
  }

  getLastGood(): T | undefined {
    return this.entry?.value
  }

  /**
   * Returns the fresh cached value if present, otherwise calls `fetcher`.
   * On fetch failure, falls back to the last known-good value (even if
   * stale) rather than propagating the error, when one exists.
   */
  async getOrFetch(fetcher: () => Promise<T>): Promise<T> {
    if (this.isFresh()) {
      return this.entry!.value
    }

    try {
      const value = await fetcher()
      this.entry = { value, expiresAt: Date.now() + this.ttlMs }
      return value
    } catch (error) {
      if (this.entry !== undefined) {
        return this.entry.value
      }
      throw error
    }
  }
}
