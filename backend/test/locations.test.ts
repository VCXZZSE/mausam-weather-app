import { describe, expect, it } from 'vitest'
import { computeLocations } from '../src/rules/locations.js'

describe('computeLocations', () => {
  it('returns the expected schema for every entry', () => {
    const result = computeLocations({ temperature: 30, condition: 'Clear sky', conditionCode: 'clear' })
    result.forEach(location => {
      expect(location.name).toEqual(expect.any(String))
      expect(location.temperature).toEqual(expect.any(Number))
      expect(location.condition).toBe('Clear sky')
      expect(location.conditionCode).toBe('clear')
      expect(location.distance).toEqual(expect.any(String))
    })
  })

  it('is deterministic for the same input', () => {
    const first = computeLocations({ temperature: 30, condition: 'Clear sky', conditionCode: 'clear' })
    const second = computeLocations({ temperature: 30, condition: 'Clear sky', conditionCode: 'clear' })
    expect(first).toEqual(second)
  })

  it('applies distinct temperature offsets per curated location (e.g. Darjeeling cooler than Kolkata)', () => {
    const result = computeLocations({ temperature: 32, condition: 'Sunny', conditionCode: 'sunny' })
    const darjeeling = result.find(l => l.name === 'Darjeeling')!
    expect(darjeeling.temperature).toBeLessThan(32)
  })

  it('returns more than one curated location', () => {
    const result = computeLocations({ temperature: 30, condition: 'Clear sky', conditionCode: 'clear' })
    expect(result.length).toBeGreaterThan(1)
  })
})
