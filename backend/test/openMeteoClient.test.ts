import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchOpenMeteoData } from '../src/providers/openMeteoClient.js'

const COORDINATES = { latitude: 22.5726, longitude: 88.3639 }
const BASE_URL = 'https://api.open-meteo.com/v1/forecast'

function validForecastBody() {
  const times = Array.from({ length: 24 }, (_, i) => `2026-09-05T${String(i).padStart(2, '0')}:00`)
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
      uv_index: times.map(() => 6),
    },
    daily: {
      time: ['2026-09-05'],
      temperature_2m_max: [31],
      temperature_2m_min: [25],
      weathercode: [95],
      precipitation_probability_max: [92],
      precipitation_sum: [34.2],
      uv_index_max: [8],
      sunrise: ['2026-09-05T05:21'],
      sunset: ['2026-09-05T17:52'],
    },
  }
}

function fetchWithBody(body: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => body })
}

describe('fetchOpenMeteoData validation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('accepts and returns a valid, complete response', async () => {
    const fetchImpl = fetchWithBody(validForecastBody())
    const result = await fetchOpenMeteoData({ baseUrl: BASE_URL, coordinates: COORDINATES, fetchImpl })
    expect(result.current_weather.temperature).toBe(31)
    expect(result.hourly.time).toHaveLength(24)
  })

  it('rejects a response missing current_weather', async () => {
    const body = validForecastBody() as any
    delete body.current_weather
    const fetchImpl = fetchWithBody(body)
    await expect(fetchOpenMeteoData({ baseUrl: BASE_URL, coordinates: COORDINATES, fetchImpl })).rejects.toThrow()
  })

  it('rejects a response missing hourly data', async () => {
    const body = validForecastBody() as any
    delete body.hourly
    const fetchImpl = fetchWithBody(body)
    await expect(fetchOpenMeteoData({ baseUrl: BASE_URL, coordinates: COORDINATES, fetchImpl })).rejects.toThrow()
  })

  it('rejects malformed hourly data (wrong type instead of number array)', async () => {
    const body = validForecastBody() as any
    body.hourly.temperature_2m = 'not-an-array'
    const fetchImpl = fetchWithBody(body)
    await expect(fetchOpenMeteoData({ baseUrl: BASE_URL, coordinates: COORDINATES, fetchImpl })).rejects.toThrow()
  })

  it('rejects malformed current_weather data (missing required field)', async () => {
    const body = validForecastBody() as any
    delete body.current_weather.temperature
    const fetchImpl = fetchWithBody(body)
    await expect(fetchOpenMeteoData({ baseUrl: BASE_URL, coordinates: COORDINATES, fetchImpl })).rejects.toThrow()
  })

  it('rejects a response with an empty hourly.time array', async () => {
    const body = validForecastBody() as any
    body.hourly.time = []
    const fetchImpl = fetchWithBody(body)
    await expect(fetchOpenMeteoData({ baseUrl: BASE_URL, coordinates: COORDINATES, fetchImpl })).rejects.toThrow()
  })

  it('never leaks the raw provider payload in the thrown error message', async () => {
    const body = validForecastBody() as any
    delete body.current_weather
    const fetchImpl = fetchWithBody(body)
    try {
      await fetchOpenMeteoData({ baseUrl: BASE_URL, coordinates: COORDINATES, fetchImpl })
      throw new Error('expected fetchOpenMeteoData to reject')
    } catch (error) {
      expect((error as Error).message).not.toContain('temperature')
      expect((error as Error).message).not.toMatch(/\d{2}:\d{2}/)
    }
  })

  it('rejects when the HTTP response is not ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) })
    await expect(fetchOpenMeteoData({ baseUrl: BASE_URL, coordinates: COORDINATES, fetchImpl })).rejects.toThrow()
  })
})
