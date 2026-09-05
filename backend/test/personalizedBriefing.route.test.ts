import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'

function openMeteoForecastFixture() {
  const times = Array.from({ length: 24 }, (_, i) => `2026-09-05T${String(i).padStart(2, '0')}:00`)
  return {
    current_weather: { time: times[6], temperature: 26, windspeed: 12, winddirection: 225, weathercode: 0 },
    hourly: {
      time: times,
      temperature_2m: times.map(() => 26),
      apparent_temperature: times.map(() => 27),
      relative_humidity_2m: times.map(() => 55),
      surface_pressure: times.map(() => 1010),
      dew_point_2m: times.map(() => 18),
      visibility: times.map(() => 8000),
      wind_gusts_10m: times.map(() => 18),
      weathercode: times.map(() => 0),
      precipitation_probability: times.map(() => 10),
      uv_index: times.map(() => 3),
    },
    daily: {
      time: ['2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11'],
      temperature_2m_max: [29, 29, 30, 30, 29, 28, 29],
      temperature_2m_min: [22, 22, 23, 23, 22, 22, 22],
      weathercode: [0, 0, 1, 2, 0, 0, 1],
      precipitation_probability_max: [10, 15, 20, 10, 5, 10, 15],
      precipitation_sum: [0, 0, 0, 0, 0, 0, 0],
      uv_index_max: [5, 5, 5, 5, 5, 5, 5],
    },
  }
}

function openMeteoAirQualityFixture() {
  const times = Array.from({ length: 24 }, (_, i) => `2026-09-05T${String(i).padStart(2, '0')}:00`)
  return {
    hourly: {
      time: times,
      pm2_5: times.map(() => 10),
      pm10: times.map(() => 20),
      ozone: times.map(() => 15),
      nitrogen_dioxide: times.map(() => 8),
      us_aqi: times.map(() => 35),
    },
  }
}

function stubFetchByUrl(handlers: { forecastFails?: boolean; airQualityFails?: boolean } = {}) {
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
    const url = input.toString()
    if (url.includes('air-quality')) {
      if (handlers.airQualityFails) throw new Error('air quality provider down')
      return { ok: true, json: async () => openMeteoAirQualityFixture() }
    }
    if (handlers.forecastFails) throw new Error('forecast provider down')
    return { ok: true, json: async () => openMeteoForecastFixture() }
  }))
}

describe('POST /api/personalized-briefing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a valid briefing for a valid request', async () => {
    stubFetchByUrl()
    const app = await buildApp(loadEnv({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/personalized-briefing',
      payload: { persona: 'outdoor', activity: 'walking', sensitivity: 'normal' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.title).toEqual(expect.any(String))
    expect(body.dataContext.temperature).toBe(26)
    expect(Array.isArray(body.risks)).toBe(true)
    expect(Array.isArray(body.actions)).toBe(true)
    await app.close()
  })

  it('defaults persona to general and succeeds with an empty body', async () => {
    stubFetchByUrl()
    const app = await buildApp(loadEnv({}))
    const response = await app.inject({ method: 'POST', url: '/api/personalized-briefing', payload: {} })
    expect(response.statusCode).toBe(200)
    await app.close()
  })

  it('returns 400 for an invalid persona', async () => {
    stubFetchByUrl()
    const app = await buildApp(loadEnv({}))
    const response = await app.inject({
      method: 'POST',
      url: '/api/personalized-briefing',
      payload: { persona: 'astronaut' },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: expect.any(String) })
    await app.close()
  })

  it('returns 502 when the core weather provider fails and no cache exists', async () => {
    stubFetchByUrl({ forecastFails: true })
    const app = await buildApp(loadEnv({}))
    const response = await app.inject({ method: 'POST', url: '/api/personalized-briefing', payload: { persona: 'general' } })
    expect(response.statusCode).toBe(502)
    await app.close()
  })

  it('still succeeds when only the air quality provider fails (aqi becomes null)', async () => {
    stubFetchByUrl({ airQualityFails: true })
    const app = await buildApp(loadEnv({}))
    const response = await app.inject({ method: 'POST', url: '/api/personalized-briefing', payload: { persona: 'health' } })
    expect(response.statusCode).toBe(200)
    expect(response.json().dataContext.aqi).toBeNull()
    await app.close()
  })

  it('never leaks internal error details in the response body', async () => {
    stubFetchByUrl({ forecastFails: true })
    const app = await buildApp(loadEnv({}))
    const response = await app.inject({ method: 'POST', url: '/api/personalized-briefing', payload: { persona: 'general' } })
    const body = response.json()
    expect(body.error).not.toContain('forecast provider down')
    await app.close()
  })
})
