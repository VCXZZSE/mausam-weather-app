import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'

function openMeteoFixtureResponse() {
  const times = Array.from({ length: 24 }, (_, i) => `2026-08-28T${String(i).padStart(2, '0')}:00`)
  return {
    current_weather: { time: times[0], temperature: 31, windspeed: 22, winddirection: 225, weathercode: 95 },
    hourly: {
      time: times,
      temperature_2m: times.map(() => 30),
      apparent_temperature: times.map(() => 37),
      relative_humidity_2m: times.map(() => 89),
      surface_pressure: times.map(() => 1008),
      dew_point_2m: times.map(() => 28),
      visibility: times.map(() => 3200),
      wind_gusts_10m: times.map(() => 38),
      weathercode: times.map(() => 95),
      precipitation_probability: times.map(() => 92),
    },
    daily: {
      time: ['2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03'],
      temperature_2m_max: [31, 30, 32, 33, 34, 31, 30],
      temperature_2m_min: [25, 25, 26, 27, 27, 25, 24],
      weathercode: [95, 65, 80, 2, 3, 61, 96],
      precipitation_probability_max: [92, 85, 60, 30, 40, 80, 90],
    },
  }
}

describe('GET /api/health', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok status', async () => {
    const app = await buildApp(loadEnv({}))
    const response = await app.inject({ method: 'GET', url: '/api/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'ok' })
    await app.close()
  })
})

describe('GET /api/weather', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a normalized payload with current, hourly and daily sections', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => openMeteoFixtureResponse(),
    }))

    const app = await buildApp(loadEnv({}))
    const response = await app.inject({ method: 'GET', url: '/api/weather' })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.current.city).toBe('Kolkata')
    expect(body.current.conditionCode).toBe('thunderstorm')
    expect(Array.isArray(body.hourly)).toBe(true)
    expect(Array.isArray(body.daily)).toBe(true)
    expect(body.daily).toHaveLength(7)
    await app.close()
  })

  it('returns 502 when the provider fails and no cached value exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const app = await buildApp(loadEnv({}))
    const response = await app.inject({ method: 'GET', url: '/api/weather' })

    expect(response.statusCode).toBe(502)
    expect(response.json()).toMatchObject({ error: expect.any(String) })
    await app.close()
  })
})
