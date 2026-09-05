import { describe, expect, it, vi } from "vitest"
import { KeyedMemoryCache } from "../src/cache/keyedMemoryCache.js"

describe("KeyedMemoryCache", () => {
  it("caches independently per key", async () => {
    const cache = new KeyedMemoryCache<string>(10_000)
    const fetchA = vi.fn().mockResolvedValue("A-weather")
    const fetchB = vi.fn().mockResolvedValue("B-weather")

    expect(await cache.getOrFetch("22.572,88.363", fetchA)).toBe("A-weather")
    expect(await cache.getOrFetch("28.704,77.102", fetchB)).toBe("B-weather")
    expect(await cache.getOrFetch("22.572,88.363", fetchA)).toBe("A-weather")

    expect(fetchA).toHaveBeenCalledTimes(1)
    expect(fetchB).toHaveBeenCalledTimes(1)
  })

  it("never returns location A stale data for location B", async () => {
    const cache = new KeyedMemoryCache<string>(10_000)
    await cache.getOrFetch("A", () => Promise.resolve("A-value"))

    const fetcherB = vi.fn().mockRejectedValue(new Error("down"))
    await expect(cache.getOrFetch("B", fetcherB)).rejects.toThrow("down")
  })

  it("falls back to the last-known-good value for the SAME key on failure", async () => {
    vi.useFakeTimers()
    try {
      const cache = new KeyedMemoryCache<number>(1000)
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(1)
        .mockRejectedValueOnce(new Error("down"))

      expect(await cache.getOrFetch("key", fetcher)).toBe(1)
      vi.advanceTimersByTime(1001)
      expect(await cache.getOrFetch("key", fetcher)).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it("re-fetches once the TTL expires for a given key", async () => {
    vi.useFakeTimers()
    try {
      const cache = new KeyedMemoryCache<number>(1000)
      const fetcher = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2)

      expect(await cache.getOrFetch("key", fetcher)).toBe(1)
      vi.advanceTimersByTime(1001)
      expect(await cache.getOrFetch("key", fetcher)).toBe(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
