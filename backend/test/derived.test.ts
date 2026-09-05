import { describe, expect, it } from 'vitest'
import { computeComfort, computeOverview, computeRainfall } from '../src/normalizers/derived.js'

describe('computeComfort', () => {
  it('rates a mild, dry, calm day as comfortable', () => {
    const result = computeComfort({ temperature: 22, humidity: 45, windSpeed: 10 })
    expect(result.label).toBe('Comfortable')
    expect(result.index).toBeGreaterThanOrEqual(70)
  })

  it('rates a hot, humid day as uncomfortable or worse', () => {
    const result = computeComfort({ temperature: 35, humidity: 90, windSpeed: 5 })
    expect(['Uncomfortable', 'Very Uncomfortable']).toContain(result.label)
  })

  it('always returns exactly 3 factors with percent between 0 and 100', () => {
    const result = computeComfort({ temperature: 40, humidity: 95, windSpeed: 60 })
    expect(result.factors).toHaveLength(3)
    result.factors.forEach(factor => {
      expect(factor.percent).toBeGreaterThanOrEqual(0)
      expect(factor.percent).toBeLessThanOrEqual(100)
    })
  })

  it('clamps the index between 0 and 100 for extreme inputs', () => {
    const result = computeComfort({ temperature: 60, humidity: 100, windSpeed: 200 })
    expect(result.index).toBeGreaterThanOrEqual(0)
    expect(result.index).toBeLessThanOrEqual(100)
  })
})

describe('computeRainfall', () => {
  it('rounds today total to 1 decimal and clamps chance to 0-100', () => {
    const result = computeRainfall({ chance: 150, todayTotal: 34.26, monthLabel: 'August' })
    expect(result.chance).toBe(100)
    expect(result.today).toBe(34.3)
    expect(result.monthLabel).toBe('August')
    expect(result.unit).toBe('mm')
  })

  it('clamps negative chance to 0', () => {
    const result = computeRainfall({ chance: -10, todayTotal: 0, monthLabel: 'January' })
    expect(result.chance).toBe(0)
  })
})

describe('computeOverview', () => {
  it('produces exactly 4 entries with required fields', () => {
    const result = computeOverview({
      aqiIndex: 78, aqiLabel: 'Moderate', uvIndex: 6, uvLabel: 'High',
      rainChanceToday: 70, windSpeed: 22, bestWindowLabel: 'before 9 AM',
    })
    expect(result).toHaveLength(4)
    result.forEach(item => {
      expect(item.icon).toEqual(expect.any(String))
      expect(item.label).toEqual(expect.any(String))
      expect(item.value).toEqual(expect.any(String))
      expect(item.tone).toEqual(expect.any(String))
    })
  })

  it('flags rain likely in commute value when rain chance is high', () => {
    const result = computeOverview({
      aqiIndex: 78, aqiLabel: 'Moderate', uvIndex: 6, uvLabel: 'High',
      rainChanceToday: 80, windSpeed: 10, bestWindowLabel: 'before 9 AM',
    })
    expect(result.find(item => item.label === 'Commute')?.value).toContain('Rain likely')
  })

  it('reports clear conditions when rain chance is low', () => {
    const result = computeOverview({
      aqiIndex: 30, aqiLabel: 'Good', uvIndex: 3, uvLabel: 'Moderate',
      rainChanceToday: 10, windSpeed: 10, bestWindowLabel: 'most of the day',
    })
    expect(result.find(item => item.label === 'Commute')?.value).toContain('Clear')
  })

  it('falls back to UV-only health value when AQI is unavailable, without showing "AQI 0"', () => {
    const result = computeOverview({
      aqiIndex: undefined, aqiLabel: 'Unavailable', uvIndex: 8, uvLabel: 'Very High',
      rainChanceToday: 20, windSpeed: 10, bestWindowLabel: 'most of the day',
    })
    const health = result.find(item => item.label === 'Health')?.value
    expect(health).not.toContain('AQI')
    expect(health).toContain('UV 8')
  })
})
