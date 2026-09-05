import { describe, expect, it, vi } from 'vitest'
import { MemoryCache } from '../src/cache/memoryCache.js'

describe('MemoryCache', () => {
  it('calls the fetcher on first access and caches the result', async () => {
    const cache = new MemoryCache<number>(10_000)
    const fetcher = vi.fn().mockResolvedValue(42)

    const first = await cache.getOrFetch(fetcher)
    const second = await cache.getOrFetch(fetcher)

    expect(first).toBe(42)
    expect(second).toBe(42)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('re-fetches once the TTL has expired', async () => {
    vi.useFakeTimers()
    try {
      const cache = new MemoryCache<number>(1000)
      const fetcher = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2)

      const first = await cache.getOrFetch(fetcher)
      vi.advanceTimersByTime(1001)
      const second = await cache.getOrFetch(fetcher)

      expect(first).toBe(1)
      expect(second).toBe(2)
      expect(fetcher).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('falls back to the last known-good value when the fetcher fails', async () => {
    vi.useFakeTimers()
    try {
      const cache = new MemoryCache<number>(1000)
      const fetcher = vi.fn().mockResolvedValueOnce(7).mockRejectedValueOnce(new Error('provider down'))

      const first = await cache.getOrFetch(fetcher)
      vi.advanceTimersByTime(1001)
      const second = await cache.getOrFetch(fetcher)

      expect(first).toBe(7)
      expect(second).toBe(7)
    } finally {
      vi.useRealTimers()
    }
  })

  it('propagates the error when the fetcher fails and there is no cached value', async () => {
    const cache = new MemoryCache<number>(1000)
    const fetcher = vi.fn().mockRejectedValue(new Error('provider down'))

    await expect(cache.getOrFetch(fetcher)).rejects.toThrow('provider down')
  })
})
