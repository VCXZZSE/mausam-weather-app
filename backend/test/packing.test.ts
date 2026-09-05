import { describe, expect, it } from "vitest"
import { computePacking } from "../src/rules/packing.js"

const BASE = {
  temperature: 26,
  rainChanceToday: 10,
  uvIndex: 3,
  windSpeed: 10,
  conditionCode: "clear",
  city: "Kolkata",
  dateLabel: "28 Aug 2026",
}

describe("computePacking", () => {
  it("recommends rain protection when rain chance is high", () => {
    const result = computePacking({
      ...BASE,
      rainChanceToday: 60,
      conditionCode: "rain",
    })
    expect(
      result.items.some((i) => i.item.toLowerCase().includes("umbrella")),
    ).toBe(true)
  })

  it("recommends sunscreen and sunglasses for high UV", () => {
    const result = computePacking({ ...BASE, uvIndex: 9 })
    expect(
      result.items.some((i) => i.item.toLowerCase().includes("sunscreen")),
    ).toBe(true)
    expect(
      result.items.some((i) => i.item.toLowerCase().includes("sunglasses")),
    ).toBe(true)
  })

  it("recommends a light layer for cooler temperatures", () => {
    const result = computePacking({ ...BASE, temperature: 15 })
    expect(
      result.items.some(
        (i) =>
          i.item.toLowerCase().includes("jacket") ||
          i.item.toLowerCase().includes("layer"),
      ),
    ).toBe(true)
  })

  it("recommends a windproof layer for strong wind", () => {
    const result = computePacking({ ...BASE, windSpeed: 35 })
    expect(
      result.items.some((i) => i.item.toLowerCase().includes("wind")),
    ).toBe(true)
  })

  it("recommends a mask only when AQI is supplied and elevated", () => {
    const withAqi = computePacking({ ...BASE, aqiIndex: 150 })
    const withoutAqi = computePacking({ ...BASE })
    expect(
      withAqi.items.some((i) => i.item.toLowerCase().includes("mask")),
    ).toBe(true)
    expect(
      withoutAqi.items.some((i) => i.item.toLowerCase().includes("mask")),
    ).toBe(false)
  })

  it("never produces duplicate item names", () => {
    const result = computePacking({
      ...BASE,
      rainChanceToday: 80,
      uvIndex: 9,
      temperature: 38,
      windSpeed: 40,
      aqiIndex: 160,
    })
    const names = result.items.map((i) => i.item)
    expect(new Set(names).size).toBe(names.length)
  })

  it("includes the city and date in the title", () => {
    const result = computePacking(BASE)
    expect(result.title).toContain("Kolkata")
    expect(result.title).toContain("28 Aug 2026")
  })

  it("produces no items for perfectly mild, dry conditions", () => {
    const result = computePacking({ ...BASE, uvIndex: 2 })
    expect(result.items).toHaveLength(0)
  })
})
