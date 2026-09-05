import { describe, expect, it } from 'vitest'
import { loadEnv } from '../src/config/env.js'

describe('loadEnv', () => {
  it('defaults ALLOWED_ORIGINS to include the frontend\'s actual Vite dev-server port (8443)', () => {
    // Regression test: vite.config.ts defaults the frontend dev server to
    // port 8443, not Vite's generic 5173. If ALLOWED_ORIGINS doesn't
    // include 8443 by default, a fresh `npm run dev` on both sides fails
    // silently via CORS — the frontend just falls back to demo data with
    // no obvious error, which is a real demo-reliability trap.
    const env = loadEnv({})
    expect(env.ALLOWED_ORIGINS).toContain('http://localhost:8443')
  })

  it('still allows the generic Vite default (5173) as a fallback', () => {
    const env = loadEnv({})
    expect(env.ALLOWED_ORIGINS).toContain('http://localhost:5173')
  })

  it('respects an explicit ALLOWED_ORIGINS override', () => {
    const env = loadEnv({ ALLOWED_ORIGINS: 'https://example.com' })
    expect(env.ALLOWED_ORIGINS).toEqual(['https://example.com'])
  })

  it('applies sensible defaults for all other configuration', () => {
    const env = loadEnv({})
    expect(env.PORT).toBe(3000)
    expect(env.DEFAULT_CITY).toBe('Kolkata')
    expect(env.DEFAULT_REGION).toBe('West Bengal')
    expect(env.WEATHER_CACHE_TTL_MS).toBeGreaterThanOrEqual(10_000)
    expect(env.AIR_QUALITY_CACHE_TTL_MS).toBeGreaterThanOrEqual(10_000)
  })

  it('throws on invalid environment configuration', () => {
    expect(() => loadEnv({ PORT: 'not-a-number' })).toThrow()
    expect(() => loadEnv({ OPEN_METEO_BASE_URL: 'not-a-url' })).toThrow()
  })
})
