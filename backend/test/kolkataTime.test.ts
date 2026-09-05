import { afterEach, describe, expect, it } from 'vitest'
import { parseKolkataCalendarDate, toKolkataInstant } from '../src/utils/kolkataTime.js'

// These assertions use only UTC getters / getTime(), which never consult
// the machine's local timezone — so this file's expected values do not
// depend on which timezone the test runner happens to use.
describe('toKolkataInstant', () => {
  it('interprets a naive Kolkata datetime string as UTC+05:30, regardless of machine timezone', () => {
    // 2026-09-05T12:00 IST is 2026-09-05T06:30 UTC (IST = UTC+5:30).
    const instant = toKolkataInstant('2026-09-05T12:00')
    expect(instant.getTime()).toBe(Date.UTC(2026, 8, 5, 6, 30))
  })

  it('treats a date-only string as midnight IST', () => {
    // 2026-09-05T00:00 IST is 2026-09-04T18:30 UTC.
    const instant = toKolkataInstant('2026-09-05')
    expect(instant.getTime()).toBe(Date.UTC(2026, 8, 4, 18, 30))
  })

  it('produces a different, later instant than naively parsing the string as UTC', () => {
    // Demonstrates the original bug: new Date('2026-09-05T12:00') (parsed
    // as UTC) is NOT the same instant as the correct IST interpretation.
    const naiveAsUtc = new Date('2026-09-05T12:00Z').getTime()
    const correct = toKolkataInstant('2026-09-05T12:00').getTime()
    expect(correct).not.toBe(naiveAsUtc)
    expect(correct).toBeLessThan(naiveAsUtc) // IST is ahead of UTC, so the correct UTC instant is earlier
  })

  it('is unaffected by the process TZ environment variable', () => {
    const original = process.env.TZ
    try {
      process.env.TZ = 'America/New_York'
      const instant = toKolkataInstant('2026-09-05T12:00')
      expect(instant.getTime()).toBe(Date.UTC(2026, 8, 5, 6, 30))
    } finally {
      process.env.TZ = original
    }
  })
})

describe('parseKolkataCalendarDate', () => {
  it('extracts the Kolkata wall-clock year/month/day/hour/minute via UTC getters', () => {
    const date = parseKolkataCalendarDate('2026-09-05T23:45')
    expect(date.getUTCFullYear()).toBe(2026)
    expect(date.getUTCMonth()).toBe(8) // September = index 8
    expect(date.getUTCDate()).toBe(5)
    expect(date.getUTCHours()).toBe(23)
    expect(date.getUTCMinutes()).toBe(45)
  })

  it('defaults time to midnight for a date-only string', () => {
    const date = parseKolkataCalendarDate('2026-09-05')
    expect(date.getUTCHours()).toBe(0)
    expect(date.getUTCMinutes()).toBe(0)
  })

  it('produces a weekday consistent with the Kolkata calendar date (2026-09-05 is a Saturday)', () => {
    const date = parseKolkataCalendarDate('2026-09-05T23:45')
    expect(date.getUTCDay()).toBe(6) // Saturday
  })

  it('is unaffected by the process TZ environment variable, including near an IST midnight boundary', () => {
    const original = process.env.TZ
    try {
      // 2026-09-05T23:45 IST is 2026-09-05T18:15 UTC — still the same UTC
      // calendar day here, but this is exactly the class of near-midnight
      // string a UTC-vs-IST mismatch would get wrong for later hours.
      process.env.TZ = 'UTC'
      const asUtcTz = parseKolkataCalendarDate('2026-09-05T23:45')
      process.env.TZ = 'America/Los_Angeles'
      const asPacificTz = parseKolkataCalendarDate('2026-09-05T23:45')
      expect(asUtcTz.getUTCDate()).toBe(asPacificTz.getUTCDate())
      expect(asUtcTz.getUTCDay()).toBe(asPacificTz.getUTCDay())
      expect(asUtcTz.getUTCMonth()).toBe(asPacificTz.getUTCMonth())
    } finally {
      process.env.TZ = original
    }
  })

  it('throws a clear error for an unrecognized format instead of silently producing an invalid date', () => {
    expect(() => parseKolkataCalendarDate('not-a-date')).toThrow()
  })
})
