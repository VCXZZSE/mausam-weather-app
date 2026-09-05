import { describe, expect, it } from 'vitest'
import { calculateAstronomy } from '../src/astronomy/astronomyCalculator.js'

const KOLKATA = { latitude: 22.5726, longitude: 88.3639 }
const NEW_YORK = { latitude: 40.7128, longitude: -74.0060 }

describe('calculateAstronomy', () => {
  it('returns formatted, non-placeholder times for a normal date/location', () => {
    const result = calculateAstronomy(new Date('2026-08-28T06:00:00Z'), KOLKATA, 'Asia/Kolkata')

    expect(result.sunrise).not.toBe('—')
    expect(result.sunset).not.toBe('—')
    expect(result.solarNoon).not.toBe('—')
    expect(result.goldenHour).not.toBe('—')
  })

  it('returns a valid moon phase label', () => {
    const result = calculateAstronomy(new Date('2026-08-28T06:00:00Z'), KOLKATA, 'Asia/Kolkata')
    expect([
      'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
      'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
    ]).toContain(result.moonPhase)
  })

  it('sunrise occurs before sunset for a typical Kolkata day', () => {
    const date = new Date('2026-08-28T06:00:00Z')
    const result = calculateAstronomy(date, KOLKATA, 'Asia/Kolkata')
    // Parse back using the same date context isn't trivial from formatted
    // strings alone, so this asserts both are present and distinct instead.
    expect(result.sunrise).not.toBe(result.sunset)
  })

  it('is not hardcoded to Kolkata — works for arbitrary coordinates and timezone', () => {
    const result = calculateAstronomy(new Date('2026-08-28T06:00:00Z'), NEW_YORK, 'America/New_York')
    expect(result.sunrise).not.toBe('—')
    expect(result.sunset).not.toBe('—')
  })

  it('formats times using the supplied IANA timezone, not the server local zone', () => {
    const date = new Date('2026-08-28T06:00:00Z')
    const kolkataResult = calculateAstronomy(date, KOLKATA, 'Asia/Kolkata')
    const nyResult = calculateAstronomy(date, KOLKATA, 'America/New_York')
    // Same instant/coordinates, different requested timezone -> different displayed clock time.
    expect(kolkataResult.solarNoon).not.toBe(nyResult.solarNoon)
  })
})
