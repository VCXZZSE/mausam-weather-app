import { describe, expect, it } from 'vitest'
import { computeSwimming } from '../src/rules/swimming.js'

const BASE = { conditionCode: 'clear', temperature: 30, uvIndex: 4, windSpeed: 10, rainChanceToday: 10, peakTime: '11:00 AM' }

describe('computeSwimming', () => {
  it('is FAVORABLE for calm, mild weather', () => {
    const result = computeSwimming(BASE)
    expect(result.badge).toBe('FAVORABLE')
  })

  it('is UNSAFE during thunderstorms', () => {
    const result = computeSwimming({ ...BASE, conditionCode: 'thunderstorm' })
    expect(result.badge).toBe('UNSAFE')
  })

  it('is ROUGH/poor during heavy rain with high rain chance', () => {
    const result = computeSwimming({ ...BASE, conditionCode: 'heavy_rain', rainChanceToday: 80 })
    expect(result.badge).toBe('ROUGH')
  })

  it('is CAUTION for very high UV', () => {
    const result = computeSwimming({ ...BASE, uvIndex: 9 })
    expect(result.badge).toBe('CAUTION')
  })

  it('is CAUTION for strong wind', () => {
    const result = computeSwimming({ ...BASE, windSpeed: 40 })
    expect(result.badge).toBe('CAUTION')
  })

  it('derives a bounded water temperature approximation from air temperature', () => {
    const result = computeSwimming({ ...BASE, temperature: 45 })
    expect(result.waterTemperature).toBeLessThanOrEqual(32)
    expect(result.waterTemperature).toBeGreaterThanOrEqual(20)
  })

  it('does not claim actual measured water temperature (stays a fixed offset from air temp)', () => {
    const a = computeSwimming({ ...BASE, temperature: 25 })
    const b = computeSwimming({ ...BASE, temperature: 28 })
    expect(b.waterTemperature - a.waterTemperature).toBe(3)
  })
})
