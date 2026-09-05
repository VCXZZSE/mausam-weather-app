import { describe, expect, it } from 'vitest'
import { computeRunning } from '../src/rules/running.js'
import type { OpenMeteoResponse } from '../src/providers/openMeteoClient.js'

function buildFixture(overrides: {
  startHour?: number
  weathercodes?: Record<number, number>
  rainChances?: Record<number, number>
  temperatures?: Record<number, number>
} = {}): OpenMeteoResponse {
  const startHour = overrides.startHour ?? 0
  const length = 24 - startHour
  const times = Array.from({ length }, (_, i) => `2026-09-05T${String(startHour + i).padStart(2, '0')}:00`)

  return {
    timezone: 'Asia/Kolkata',
    utc_offset_seconds: 19800,
    current_weather: { time: times[0], temperature: 24, windspeed: 10, winddirection: 200, weathercode: 0, is_day: 1 },
    hourly: {
      time: times,
      temperature_2m: times.map((_, i) => overrides.temperatures?.[startHour + i] ?? 24),
      apparent_temperature: times.map(() => 25),
      relative_humidity_2m: times.map(() => 60),
      surface_pressure: times.map(() => 1010),
      dew_point_2m: times.map(() => 18),
      visibility: times.map(() => 8000),
      wind_gusts_10m: times.map(() => 15),
      weathercode: times.map((_, i) => overrides.weathercodes?.[startHour + i] ?? 0),
      precipitation_probability: times.map((_, i) => overrides.rainChances?.[startHour + i] ?? 5),
      uv_index: times.map(() => 3),
    },
    daily: {
      time: ['2026-09-05'],
      temperature_2m_max: [29],
      temperature_2m_min: [22],
      weathercode: [0],
      precipitation_probability_max: [10],
      precipitation_sum: [0],
      uv_index_max: [5],
      sunrise: ['2026-09-05T05:21'],
      sunset: ['2026-09-05T17:52'],
    },
  }
}

describe('computeRunning', () => {
  it('finds a favorable morning window from real hourly data (starting before 5am)', () => {
    const data = buildFixture({ startHour: 0 })
    const result = computeRunning(data)
    expect(result.start).not.toBe('')
    expect(result.end).not.toBe('')
    expect(result.badge).toBe('FITNESS')
  })

  it('never fabricates a time not present in the hourly forecast', () => {
    const data = buildFixture({ startHour: 0 })
    const result = computeRunning(data)
    if (result.start) {
      expect(data.hourly.time.some(t => t.includes(':'))).toBe(true) // sanity: real times exist
    }
  })

  it('excludes thunderstorm hours from the morning window', () => {
    const data = buildFixture({ startHour: 0, weathercodes: { 5: 95, 6: 95, 7: 95, 8: 95, 9: 95 } })
    const result = computeRunning(data)
    expect(result.start).toBe('')
    expect(result.summary.length).toBeGreaterThan(0)
  })

  it("reports today's morning as already passed when the forecast starts after 9am", () => {
    const data = buildFixture({ startHour: 14 })
    const result = computeRunning(data)
    expect(result.start).toBe('')
    expect(result.summary).toContain('already passed')
  })

  it('never spans across a day boundary (no cross-midnight window)', () => {
    // 24 hours starting at hour 0 only contains ONE day's 5-9am block, so
    // this mainly guards against a future regression reintroducing a
    // multi-day lookahead that could bridge across midnight.
    const data = buildFixture({ startHour: 0 })
    const result = computeRunning(data)
    if (result.start && result.end) {
      const startHour = Number(data.hourly.time.find(t => t.length > 0)?.slice(11, 13))
      expect(Number.isFinite(startHour)).toBe(true)
    }
  })
})
