import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAirQualityCaches, resolveAirQuality } from '../src/aqi/resolveAirQuality.js'
import { loadEnv } from '../src/config/env.js'

const KOLKATA = { latitude: 22.5726, longitude: 88.3639 }
const noopLog = { warn: () => {} }

function cpcbBody() {
  return {
    records: [
      {
        country: 'India', state: 'West Bengal', city: 'Kolkata',
        station: 'Rabindra Bharati University, Kolkata - WBPCB',
        last_update: '05-09-2026 09:00:00',
        pollutant_id: 'PM2.5', pollutant_avg: '65',
        latitude: '22.627', longitude: '88.3806',
      },
    ],
  }
}

function openMeteoAqiBody() {
  const times = Array.from({ length: 24 }, (_, i) => `2026-09-05T${String(i).padStart(2, '0')}:00`)
  return {
    hourly: {
      time: times,
      pm2_5: times.map(() => 42),
      pm10: times.map(() => 68),
      ozone: times.map(() => 38),
      nitrogen_dioxide: times.map(() => 22),
      us_aqi: times.map(() => 78),
    },
  }
}

describe('resolveAirQuality', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('skips CPCB entirely (no network call) when no API key is configured', async () => {
    const fetchSpy = vi.fn(async (input: string | URL) => {
      const url = input.toString()
      if (url.includes('data.gov.in')) throw new Error('should not call CPCB without a key')
      return { ok: true, json: async () => openMeteoAqiBody() }
    })
    vi.stubGlobal('fetch', fetchSpy)

    const env = loadEnv({ DATA_GOV_IN_API_KEY: '' })
    const caches = createAirQualityCaches(env)
    const result = await resolveAirQuality(env, caches, KOLKATA, '2026-09-05T05:00', noopLog)

    expect(result?.source).toBe('OPEN_METEO')
    expect(fetchSpy).toHaveBeenCalledTimes(1) // only the Open-Meteo call
  })

  it('uses CPCB when a key is configured and a station is within range', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = input.toString()
      if (url.includes('data.gov.in')) return { ok: true, json: async () => cpcbBody() }
      return { ok: true, json: async () => openMeteoAqiBody() }
    }))

    const env = loadEnv({ DATA_GOV_IN_API_KEY: 'test-key' })
    const caches = createAirQualityCaches(env)
    const result = await resolveAirQuality(env, caches, KOLKATA, '2026-09-05T05:00', noopLog)

    expect(result?.source).toBe('CPCB')
    expect(result?.standard).toBe('IN_NAQI')
  })

  it('falls back to Open-Meteo when CPCB request fails (network error)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = input.toString()
      if (url.includes('data.gov.in')) throw new Error('CPCB down')
      return { ok: true, json: async () => openMeteoAqiBody() }
    }))

    const env = loadEnv({ DATA_GOV_IN_API_KEY: 'test-key' })
    const caches = createAirQualityCaches(env)
    const result = await resolveAirQuality(env, caches, KOLKATA, '2026-09-05T05:00', noopLog)

    expect(result?.source).toBe('OPEN_METEO')
    expect(result?.standard).toBe('US_AQI')
  })

  it('falls back to Open-Meteo when CPCB has no station within range', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = input.toString()
      if (url.includes('data.gov.in')) {
        return { ok: true, json: async () => ({ records: [{ pollutant_id: 'PM2.5', pollutant_avg: '50', latitude: '28.6139', longitude: '77.2090' }] }) }
      }
      return { ok: true, json: async () => openMeteoAqiBody() }
    }))

    const env = loadEnv({ DATA_GOV_IN_API_KEY: 'test-key' })
    const caches = createAirQualityCaches(env)
    const result = await resolveAirQuality(env, caches, KOLKATA, '2026-09-05T05:00', noopLog)

    expect(result?.source).toBe('OPEN_METEO')
  })

  it('falls back to Open-Meteo when CPCB returns an unauthorized/invalid response', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = input.toString()
      if (url.includes('data.gov.in')) return { ok: false, status: 403, json: async () => ({ error: 'Key not authorised' }) }
      return { ok: true, json: async () => openMeteoAqiBody() }
    }))

    const env = loadEnv({ DATA_GOV_IN_API_KEY: 'invalid-key' })
    const caches = createAirQualityCaches(env)
    const result = await resolveAirQuality(env, caches, KOLKATA, '2026-09-05T05:00', noopLog)

    expect(result?.source).toBe('OPEN_METEO')
  })

  it('returns undefined when both CPCB and Open-Meteo fail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('everything is down')
    }))

    const env = loadEnv({ DATA_GOV_IN_API_KEY: 'test-key' })
    const caches = createAirQualityCaches(env)
    const result = await resolveAirQuality(env, caches, KOLKATA, '2026-09-05T05:00', noopLog)

    expect(result).toBeUndefined()
  })

  it('never mislabels an Open-Meteo fallback result as CPCB/IN_NAQI', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = input.toString()
      if (url.includes('data.gov.in')) throw new Error('CPCB down')
      return { ok: true, json: async () => openMeteoAqiBody() }
    }))

    const env = loadEnv({ DATA_GOV_IN_API_KEY: 'test-key' })
    const caches = createAirQualityCaches(env)
    const result = await resolveAirQuality(env, caches, KOLKATA, '2026-09-05T05:00', noopLog)

    expect(result?.source).not.toBe('CPCB')
    expect(result?.standard).not.toBe('IN_NAQI')
  })
})
