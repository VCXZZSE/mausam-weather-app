import { describe, expect, it } from 'vitest'
import { toDashboardWeatherData } from '../src/normalizers/toDashboardWeatherData.js'
import type { OpenMeteoResponse } from '../src/providers/openMeteoClient.js'
import type { OpenMeteoAirQualityResponse } from '../src/providers/openMeteoAirQualityClient.js'

const CONTEXT = { city: 'Kolkata', region: 'West Bengal', latitude: 22.5726, longitude: 88.3639 }

function buildFixture(overrides: Partial<OpenMeteoResponse> = {}): OpenMeteoResponse {
  const hourlyLength = 24
  const times = Array.from({ length: hourlyLength }, (_, i) => `2026-08-28T${String(i).padStart(2, '0')}:00`)

  return {
    current_weather: {
      time: times[5],
      temperature: 31,
      windspeed: 22,
      winddirection: 225,
      weathercode: 95,
    },
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
      uv_index: times.map((_, i) => (i >= 5 && i <= 16 ? 7 : 0)),
    },
    daily: {
      time: ['2026-08-28', '2026-08-29', '2026-08-30'],
      temperature_2m_max: [31, 30, 32],
      temperature_2m_min: [25, 25, 26],
      weathercode: [95, 65, 80],
      precipitation_probability_max: [92, 85, 60],
      precipitation_sum: [34.2, 20.1, 5.4],
      uv_index_max: [8, 7, 6],
    },
    ...overrides,
  }
}

function buildAirQualityFixture(): OpenMeteoAirQualityResponse {
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

describe('toDashboardWeatherData', () => {
  it('maps current weather fields including derived hero variant', () => {
    const result = toDashboardWeatherData(buildFixture(), undefined, CONTEXT)

    expect(result.current.city).toBe('Kolkata')
    expect(result.current.region).toBe('West Bengal')
    expect(result.current.temperature).toBe(31)
    expect(result.current.conditionCode).toBe('thunderstorm')
    expect(result.current.heroVariant).toBe('rainy')
    expect(result.current.windDirection).toBe('SW')
    expect(result.current.humidity).toBe(89)
    expect(result.current.high).toBe(31)
    expect(result.current.low).toBe(25)
  })

  it('does not include fields not sourced from Open-Meteo (e.g. hydrationAdvice)', () => {
    const result = toDashboardWeatherData(buildFixture(), undefined, CONTEXT)
    expect(result.current.hydrationAdvice).toBeUndefined()
  })

  it('produces exactly 7 daily entries with day labels starting at Today', () => {
    const fixture = buildFixture({
      daily: {
        time: ['2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03'],
        temperature_2m_max: [31, 30, 32, 33, 34, 31, 30],
        temperature_2m_min: [25, 25, 26, 27, 27, 25, 24],
        weathercode: [95, 65, 80, 2, 3, 61, 96],
        precipitation_probability_max: [92, 85, 60, 30, 40, 80, 90],
        precipitation_sum: [34.2, 20.1, 5.4, 0, 0, 12.3, 40.1],
        uv_index_max: [8, 7, 6, 5, 4, 6, 7],
      },
    })
    const result = toDashboardWeatherData(fixture, undefined, CONTEXT)

    expect(result.daily).toHaveLength(7)
    expect(result.daily[0].day).toBe('Today')
    expect(result.daily[1].conditionCode).toBe('heavy_rain')
  })

  it('produces up to 10 hourly entries starting from the current hour, labeled Now', () => {
    const result = toDashboardWeatherData(buildFixture(), undefined, CONTEXT)

    expect(result.hourly.length).toBeGreaterThan(0)
    expect(result.hourly.length).toBeLessThanOrEqual(10)
    expect(result.hourly[0].time).toBe('Now')
    expect(result.hourly[0].rainChance).toBe(92)
  })

  it('falls back to a default condition for unknown weather codes', () => {
    const fixture = buildFixture({
      current_weather: { time: '2026-08-28T05:00', temperature: 25, windspeed: 5, winddirection: 10, weathercode: 9999 },
    })
    const result = toDashboardWeatherData(fixture, undefined, CONTEXT)
    expect(result.current.conditionCode).toBe('cloudy')
  })

  it('omits airQuality when no air quality data is supplied', () => {
    const result = toDashboardWeatherData(buildFixture(), undefined, CONTEXT)
    expect(result.airQuality).toBeUndefined()
  })

  it('includes a normalized airQuality section when air quality data is supplied', () => {
    const result = toDashboardWeatherData(buildFixture(), buildAirQualityFixture(), CONTEXT)
    expect(result.airQuality).toBeDefined()
    expect(result.airQuality?.index).toBe(78)
    expect(result.airQuality?.pollutants).toHaveLength(4)
  })

  it('normalizes uv from the current hour uv_index', () => {
    const result = toDashboardWeatherData(buildFixture(), undefined, CONTEXT)
    expect(result.uv.index).toBe(7)
    expect(result.uv.label).toBe('High')
  })

  it('computes astronomy fields as non-placeholder times', () => {
    const result = toDashboardWeatherData(buildFixture(), undefined, CONTEXT)
    expect(result.astronomy.sunrise).not.toBe('—')
    expect(result.astronomy.sunset).not.toBe('—')
    expect(result.astronomy.moonPhase).toEqual(expect.any(String))
  })

  it('computes comfort from temperature/humidity/wind', () => {
    const result = toDashboardWeatherData(buildFixture(), undefined, CONTEXT)
    expect(result.comfort.index).toBeGreaterThanOrEqual(0)
    expect(result.comfort.index).toBeLessThanOrEqual(100)
    expect(result.comfort.factors).toHaveLength(3)
  })

  it('computes rainfall today from daily precipitation_sum', () => {
    const result = toDashboardWeatherData(buildFixture(), undefined, CONTEXT)
    expect(result.rainfall.today).toBe(34.2)
    expect(result.rainfall.chance).toBe(92)
    expect(result.rainfall.unit).toBe('mm')
  })

  it('produces 4 overview entries derived from available data', () => {
    const result = toDashboardWeatherData(buildFixture(), buildAirQualityFixture(), CONTEXT)
    expect(result.overview).toHaveLength(4)
    expect(result.overview[0].value).toContain('AQI 78')
  })
})
