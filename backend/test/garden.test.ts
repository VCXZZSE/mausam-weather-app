import { describe, expect, it } from "vitest"
import { computeGarden } from "../src/rules/garden.js"

const BASE = {
  temperature: 26,
  rainChanceToday: 10,
  humidity: 50,
  windSpeed: 10,
  month: 0,
}

describe("computeGarden", () => {
  it("reports RAINY badge and saturated soil when rain chance is high", () => {
    const result = computeGarden({ ...BASE, rainChanceToday: 70 })
    expect(result.badge).toBe("RAINY")
    expect(result.soil).toBe("Saturated")
  })

  it("reports HOT badge for extreme heat", () => {
    const result = computeGarden({ ...BASE, temperature: 40 })
    expect(result.badge).toBe("HOT")
  })

  it("reports WINDY badge for strong wind", () => {
    const result = computeGarden({ ...BASE, windSpeed: 35 })
    expect(result.badge).toBe("WINDY")
  })

  it("reports GOOD badge for moderate conditions", () => {
    const result = computeGarden(BASE)
    expect(result.badge).toBe("GOOD")
  })

  it("produces a seasonal title and note that vary by month/season", () => {
    const monsoon = computeGarden({ ...BASE, month: 6 })
    const winter = computeGarden({ ...BASE, month: 0 })
    expect(monsoon.title).not.toBe(winter.title)
  })

  it("reports dry soil for low rain and low humidity", () => {
    const result = computeGarden({ ...BASE, rainChanceToday: 5, humidity: 30 })
    expect(result.soil).toBe("Dry")
  })
})
