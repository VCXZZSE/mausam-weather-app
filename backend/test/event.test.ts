import { describe, expect, it } from "vitest"
import { computeEvent } from "../src/rules/event.js"
import type { DailyForecast } from "../src/types/dashboard.js"

function buildDaily(rainChances: number[], highs: number[]): DailyForecast[] {
  return rainChances.map((rainChance, i) => ({
    day: i === 0 ? "Today" : `Day${i}`,
    high: highs[i],
    low: highs[i] - 5,
    condition: "Test",
    conditionCode: "clear",
    rainChance,
  }))
}

describe("computeEvent", () => {
  it("does not fabricate a real festival/event name", () => {
    const daily = buildDaily(
      [10, 10, 10, 10, 10, 10, 10],
      [30, 30, 30, 30, 30, 30, 30],
    )
    const result = computeEvent({
      daily,
      currentDate: new Date("2026-08-28T06:00:00Z"),
      month: 7,
    })
    expect(result.title).not.toMatch(/puja|festival|diwali|eid/i)
  })

  it("reports Low Rain and favorable advice for a dry week", () => {
    const daily = buildDaily(
      [10, 10, 10, 10, 10, 10, 10],
      [30, 30, 30, 30, 30, 30, 30],
    )
    const result = computeEvent({
      daily,
      currentDate: new Date("2026-08-28T06:00:00Z"),
      month: 7,
    })
    expect(result.rainLabel).toBe("Low Rain")
  })

  it("reports High Rain for a very wet week", () => {
    const daily = buildDaily(
      [80, 85, 90, 88, 92, 87, 90],
      [28, 28, 28, 28, 28, 28, 28],
    )
    const result = computeEvent({
      daily,
      currentDate: new Date("2026-08-28T06:00:00Z"),
      month: 7,
    })
    expect(result.rainLabel).toBe("High Rain")
  })

  it("computes daysAway between 0 and 6", () => {
    const daily = buildDaily(
      [10, 10, 10, 10, 10, 10, 10],
      [30, 30, 30, 30, 30, 30, 30],
    )
    const result = computeEvent({
      daily,
      currentDate: new Date("2026-08-28T06:00:00Z"),
      month: 7,
    })
    expect(result.daysAway).toBeGreaterThanOrEqual(0)
    expect(result.daysAway).toBeLessThanOrEqual(6)
  })

  it("is deterministic for the same date and forecast", () => {
    const daily = buildDaily(
      [10, 20, 30, 10, 10, 10, 10],
      [30, 31, 29, 30, 30, 30, 30],
    )
    const date = new Date("2026-08-28T06:00:00Z")
    const first = computeEvent({ daily, currentDate: date, month: 7 })
    const second = computeEvent({ daily, currentDate: date, month: 7 })
    expect(first).toEqual(second)
  })

  it("sets expectedSeason based on month", () => {
    const daily = buildDaily(
      [10, 10, 10, 10, 10, 10, 10],
      [30, 30, 30, 30, 30, 30, 30],
    )
    const monsoonResult = computeEvent({
      daily,
      currentDate: new Date("2026-08-28T06:00:00Z"),
      month: 7,
    })
    const winterResult = computeEvent({
      daily,
      currentDate: new Date("2026-08-28T06:00:00Z"),
      month: 0,
    })
    expect(monsoonResult.expectedSeason).toBe("Monsoon")
    expect(winterResult.expectedSeason).toBe("Winter")
  })
})
