import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'

function openMeteoForecastFixture() {
  const times = Array.from({ length: 24 }, (_, i) => `2026-08-28T${String(i).padStart(2, '0')}:00`)
  return {
    timezone: 'Asia/Kolkata',
    utc_offset_seconds: 19800,
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
      uv_index: times.map((_, i) => (i >= 6 && i <= 16 ? 7 : 0)),
    },
    daily: {
      time: ['2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03'],
      temperature_2m_max: [31, 30, 32, 33, 34, 31, 30],
      temperature_2m_min: [25, 25, 26, 27, 27, 25, 24],
      weathercode: [95, 65, 80, 2, 3, 61, 96],
      precipitation_probability_max: [92, 85, 60, 30, 40, 80, 90],
      precipitation_sum: [34.2, 20.1, 5.4, 0, 0, 12.3, 40.1],
      uv_index_max: [8, 7, 6, 5, 4, 6, 7],
      sunrise: Array(7).fill('2026-08-28T05:21'),
      sunset: Array(7).fill('2026-08-28T18:14'),
    },
  }
}

function openMeteoAirQualityFixture() {
  const times = Array.from({ length: 24 }, (_, i) => `2026-08-28T${String(i).padStart(2, '0')}:00`)
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

function stubFetchByUrl(handlers: { forecast?: () => unknown; airQuality?: () => unknown; forecastFails?: boolean; airQualityFails?: boolean }) {
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
    const url = input.toString()
    if (url.includes('air-quality')) {
      if (handlers.airQualityFails) throw new Error('air quality provider down')
      return { ok: true, json: async () => (handlers.airQuality ?? openMeteoAirQualityFixture)() }
    }
    if (handlers.forecastFails) throw new Error('forecast provider down')
    return { ok: true, json: async () => (handlers.forecast ?? openMeteoForecastFixture)() }
  }))
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

  it('returns a normalized payload including Phase 2 sections when both providers succeed', async () => {
    stubFetchByUrl({})

    const app = await buildApp(loadEnv({}))
    const response = await app.inject({ method: 'GET', url: '/api/weather' })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.current.city).toBe('Kolkata')
    expect(body.current.conditionCode).toBe('thunderstorm')
    expect(Array.isArray(body.hourly)).toBe(true)
    expect(Array.isArray(body.daily)).toBe(true)
    expect(body.daily).toHaveLength(7)
    expect(body.airQuality).toBeDefined()
    expect(body.airQuality.index).toBe(78)
    expect(body.uv).toBeDefined()
    expect(body.astronomy).toBeDefined()
    expect(body.comfort).toBeDefined()
    expect(body.rainfall).toBeDefined()
    expect(body.overview).toHaveLength(4)
    expect(body.pollen).toBeDefined()
    expect(Array.isArray(body.alerts)).toBe(true)
    expect(body.commute).toBeDefined()
    expect(body.swimming).toBeDefined()
    expect(body.garden).toBeDefined()
    expect(Array.isArray(body.locations)).toBe(true)
    expect(body.packing).toBeDefined()
    expect(body.event).toBeDefined()
    await app.close()
  })

  it('returns 502 when the core forecast provider fails and no cached value exists', async () => {
    stubFetchByUrl({ forecastFails: true })

    const app = await buildApp(loadEnv({}))
    const response = await app.inject({ method: 'GET', url: '/api/weather' })

    expect(response.statusCode).toBe(502)
    expect(response.json()).toMatchObject({ error: expect.any(String) })
    await app.close()
  })

  it('omits airQuality gracefully when the air quality provider fails and there is no cache', async () => {
    stubFetchByUrl({ airQualityFails: true })

    const app = await buildApp(loadEnv({}))
    const response = await app.inject({ method: 'GET', url: '/api/weather' })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.current).toBeDefined()
    expect(body.airQuality).toBeUndefined()
    await app.close()
  })

  it('still returns core weather fields when only the air quality provider is down', async () => {
    stubFetchByUrl({ airQualityFails: true })

    const app = await buildApp(loadEnv({}))
    const response = await app.inject({ method: 'GET', url: '/api/weather' })
    const body = response.json()

    expect(body.uv).toBeDefined()
    expect(body.astronomy).toBeDefined()
    expect(body.comfort).toBeDefined()
    expect(body.commute).toBeDefined()
    expect(body.packing).toBeDefined()
    expect(body.event).toBeDefined()
    await app.close()
  })

  it('uses explicit coordinates from the query string, not the default location', async () => {
    stubFetchByUrl({})
    const app = await buildApp(loadEnv({}))

    const response = await app.inject({
      method: 'GET',
      url: '/api/weather?latitude=28.6139&longitude=77.2090&locality=New%20Delhi&region=Delhi&country=India&source=manual',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.current.city).toBe('New Delhi')
    expect(body.location.latitude).toBe(28.6139)
    expect(body.location.longitude).toBe(77.209)
    expect(body.location.source).toBe('manual')
    await app.close()
  })

  it('never returns one location\'s cached weather for a different location', async () => {
    let callCount = 0
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = input.toString()
      if (url.includes('air-quality')) return { ok: true, json: async () => openMeteoAirQualityFixture() }
      callCount += 1
      const fixture = openMeteoForecastFixture()
      fixture.current_weather.temperature = callCount === 1 ? 31 : 15
      return { ok: true, json: async () => fixture }
    }))

    const app = await buildApp(loadEnv({}))
    const kolkata = await app.inject({ method: 'GET', url: '/api/weather?latitude=22.5726&longitude=88.3639' })
    const shimla = await app.inject({ method: 'GET', url: '/api/weather?latitude=31.1048&longitude=77.1734' })

    expect(kolkata.json().current.temperature).toBe(31)
    expect(shimla.json().current.temperature).toBe(15)
    await app.close()
  })

  it('rejects a request with no coordinates when ALLOW_DEFAULT_LOCATION is disabled', async () => {
    stubFetchByUrl({})
    const app = await buildApp(loadEnv({ ALLOW_DEFAULT_LOCATION: 'false' }))

    const response = await app.inject({ method: 'GET', url: '/api/weather' })
    expect(response.statusCode).toBe(400)
    await app.close()
  })

  it('marks a request with no coordinates as source "default" when defaults are allowed', async () => {
    stubFetchByUrl({})
    const app = await buildApp(loadEnv({}))

    const response = await app.inject({ method: 'GET', url: '/api/weather' })
    expect(response.json().location.source).toBe('default')
    await app.close()
  })

  it('rejects an out-of-range latitude', async () => {
    stubFetchByUrl({})
    const app = await buildApp(loadEnv({}))
    const response = await app.inject({ method: 'GET', url: '/api/weather?latitude=999&longitude=88' })
    expect(response.statusCode).toBe(400)
    await app.close()
  })
})
