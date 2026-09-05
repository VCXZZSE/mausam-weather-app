import { describe, expect, it } from 'vitest'
import { computeCuratedAlerts } from '../src/data/curatedAlerts.js'

const BASE = { conditionCode: 'clear', temperature: 28, windSpeed: 10, rainChanceToday: 20, month: 0 }

describe('computeCuratedAlerts', () => {
  it('returns no alerts for normal, mild conditions', () => {
    const alerts = computeCuratedAlerts(BASE)
    expect(alerts).toHaveLength(0)
  })

  it('raises a Red thunderstorm advisory for thunderstorm conditions', () => {
    const alerts = computeCuratedAlerts({ ...BASE, conditionCode: 'thunderstorm' })
    expect(alerts[0].level).toBe('Red')
    expect(alerts[0].title).toContain('Thunderstorm')
  })

  it('raises a heavy rainfall warning when rain chance is high', () => {
    const alerts = computeCuratedAlerts({ ...BASE, conditionCode: 'rain', rainChanceToday: 75 })
    expect(alerts.some(a => a.title.includes('Heavy Rainfall'))).toBe(true)
  })

  it('raises a monsoon flooding risk alert only during monsoon months with very high rain chance', () => {
    const monsoon = computeCuratedAlerts({ ...BASE, conditionCode: 'rain', rainChanceToday: 85, month: 6 })
    const nonMonsoon = computeCuratedAlerts({ ...BASE, conditionCode: 'rain', rainChanceToday: 85, month: 0 })
    expect(monsoon.some(a => a.title.includes('Monsoon Flooding'))).toBe(true)
    expect(nonMonsoon.some(a => a.title.includes('Monsoon Flooding'))).toBe(false)
  })

  it('raises a heatwave advisory for high temperature, and extreme heat warning for very high temperature', () => {
    const hot = computeCuratedAlerts({ ...BASE, temperature: 39 })
    const extreme = computeCuratedAlerts({ ...BASE, temperature: 43 })
    expect(hot.some(a => a.title.includes('Heatwave'))).toBe(true)
    expect(extreme.some(a => a.title.includes('Extreme Heat'))).toBe(true)
  })

  it('raises a strong wind advisory for high wind speed', () => {
    const alerts = computeCuratedAlerts({ ...BASE, windSpeed: 45 })
    expect(alerts.some(a => a.title.includes('Wind'))).toBe(true)
  })

  it('raises a poor air quality advisory only when AQI is supplied and high', () => {
    const withAqi = computeCuratedAlerts({ ...BASE, aqiIndex: 160 })
    const withoutAqi = computeCuratedAlerts({ ...BASE })
    expect(withAqi.some(a => a.title.includes('Air Quality'))).toBe(true)
    expect(withoutAqi.some(a => a.title.includes('Air Quality'))).toBe(false)
  })

  it('never sets the source to a government agency name', () => {
    const alerts = computeCuratedAlerts({ ...BASE, conditionCode: 'thunderstorm', windSpeed: 45, temperature: 43 })
    alerts.forEach(alert => {
      expect(alert.source).not.toBe('IMD')
    })
  })

  it('orders alerts most severe first', () => {
    const alerts = computeCuratedAlerts({ ...BASE, windSpeed: 45, temperature: 43 })
    const levels = alerts.map(a => a.level)
    expect(levels.indexOf('Red')).toBeLessThanOrEqual(levels.indexOf('Yellow') === -1 ? Infinity : levels.indexOf('Yellow'))
  })

  it('is deterministic for identical inputs', () => {
    const first = computeCuratedAlerts({ ...BASE, conditionCode: 'thunderstorm' })
    const second = computeCuratedAlerts({ ...BASE, conditionCode: 'thunderstorm' })
    expect(first).toEqual(second)
  })
})
