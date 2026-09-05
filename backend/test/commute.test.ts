import { describe, expect, it } from 'vitest'
import { computeCommute } from '../src/rules/commute.js'

const BASE = { conditionCode: 'clear', rainChanceToday: 10, windSpeed: 10, visibilityKm: 8, city: 'Kolkata' }

describe('computeCommute', () => {
  it('reports NORMAL status for good weather', () => {
    const result = computeCommute(BASE)
    expect(result.status).toBe('NORMAL')
    expect(result.location).toBe('Kolkata')
    expect(result.items).toHaveLength(3)
  })

  it('reports DISRUPTED status for heavy rain', () => {
    const result = computeCommute({ ...BASE, conditionCode: 'heavy_rain', rainChanceToday: 80 })
    expect(result.status).toBe('DISRUPTED')
  })

  it('reports DISRUPTED status for thunderstorms', () => {
    const result = computeCommute({ ...BASE, conditionCode: 'thunderstorm' })
    expect(result.status).toBe('DISRUPTED')
  })

  it('reports CAUTION status for strong wind without rain', () => {
    const result = computeCommute({ ...BASE, windSpeed: 35 })
    expect(result.status).toBe('CAUTION')
  })

  it('reports CAUTION for reduced visibility', () => {
    const result = computeCommute({ ...BASE, visibilityKm: 2 })
    expect(result.status).toBe('CAUTION')
  })

  it('always returns exactly 3 items with required fields', () => {
    const result = computeCommute(BASE)
    result.items.forEach(item => {
      expect(item.icon).toEqual(expect.any(String))
      expect(item.name).toEqual(expect.any(String))
      expect(item.value).toEqual(expect.any(String))
      expect(item.detail).toEqual(expect.any(String))
    })
  })
})
