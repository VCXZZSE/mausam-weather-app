import { describe, expect, it } from "vitest"
import {
  parseLocalCalendarDate,
  toLocationInstant,
} from "../src/utils/locationTime.js"

// These assertions use only UTC getters / getTime(), which never consult
// the machine's local timezone — so expected values don't depend on which
// timezone the test runner happens to use.
describe("toLocationInstant", () => {
  it("interprets a naive local datetime string using the supplied UTC offset (Kolkata, +05:30)", () => {
    // 2026-09-05T12:00 IST (+05:30) is 2026-09-05T06:30 UTC.
    const instant = toLocationInstant("2026-09-05T12:00", 19800)
    expect(instant.getTime()).toBe(Date.UTC(2026, 8, 5, 6, 30))
  })

  it("works for a different location entirely (New York, -04:00 in DST)", () => {
    // 2026-09-05T12:00 EDT (-04:00) is 2026-09-05T16:00 UTC.
    const instant = toLocationInstant("2026-09-05T12:00", -14400)
    expect(instant.getTime()).toBe(Date.UTC(2026, 8, 5, 16, 0))
  })

  it("treats a date-only string as midnight at the given offset", () => {
    const instant = toLocationInstant("2026-09-05", 19800)
    expect(instant.getTime()).toBe(Date.UTC(2026, 8, 4, 18, 30))
  })

  it("is unaffected by the process TZ environment variable", () => {
    const original = process.env.TZ
    try {
      process.env.TZ = "America/Los_Angeles"
      const instant = toLocationInstant("2026-09-05T12:00", 19800)
      expect(instant.getTime()).toBe(Date.UTC(2026, 8, 5, 6, 30))
    } finally {
      process.env.TZ = original
    }
  })
})

describe("parseLocalCalendarDate", () => {
  it("extracts the wall-clock year/month/day/hour/minute via UTC getters, regardless of location", () => {
    const date = parseLocalCalendarDate("2026-09-05T23:45")
    expect(date.getUTCFullYear()).toBe(2026)
    expect(date.getUTCMonth()).toBe(8)
    expect(date.getUTCDate()).toBe(5)
    expect(date.getUTCHours()).toBe(23)
    expect(date.getUTCMinutes()).toBe(45)
  })

  it("does not apply any offset — the same naive string parses identically no matter what location it came from", () => {
    const asIfKolkata = parseLocalCalendarDate("2026-09-05T09:00")
    const asIfNewYork = parseLocalCalendarDate("2026-09-05T09:00")
    expect(asIfKolkata.getTime()).toBe(asIfNewYork.getTime())
  })

  it("throws a clear error for an unrecognized format", () => {
    expect(() => parseLocalCalendarDate("not-a-date")).toThrow()
  })
})
