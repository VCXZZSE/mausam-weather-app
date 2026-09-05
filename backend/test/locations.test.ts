import { describe, expect, it } from "vitest"
import { computeLocations } from "../src/rules/locations.js"

describe("computeLocations", () => {
  it("returns the expected schema for every entry", () => {
    const result = computeLocations({
      temperature: 30,
      condition: "Clear sky",
      conditionCode: "clear",
    })
    result.forEach((location) => {
      expect(location.name).toEqual(expect.any(String))
      expect(location.temperature).toEqual(expect.any(Number))
      expect(location.condition).toEqual(expect.any(String))
      expect(location.conditionCode).toEqual(expect.any(String))
      expect(location.distance).toEqual(expect.any(String))
    })
  })

  it("is deterministic for the same input", () => {
    const first = computeLocations({
      temperature: 30,
      condition: "Clear sky",
      conditionCode: "clear",
    })
    const second = computeLocations({
      temperature: 30,
      condition: "Clear sky",
      conditionCode: "clear",
    })
    expect(first).toEqual(second)
  })

  it("applies distinct temperature offsets per curated location (e.g. Darjeeling cooler than Kolkata)", () => {
    const result = computeLocations({
      temperature: 32,
      condition: "Sunny",
      conditionCode: "sunny",
    })
    const darjeeling = result.find((l) => l.name === "Darjeeling")!
    expect(darjeeling.temperature).toBeLessThan(32)
  })

  it("returns more than one curated location", () => {
    const result = computeLocations({
      temperature: 30,
      condition: "Clear sky",
      conditionCode: "clear",
    })
    expect(result.length).toBeGreaterThan(1)
  })

  it("shares the live condition for regionally plausible coastal/deltaic locations", () => {
    const result = computeLocations({
      temperature: 30,
      condition: "Showers",
      conditionCode: "showers",
    })
    expect(result.find((l) => l.name === "Digha Beach")?.conditionCode).toBe(
      "showers",
    )
    expect(result.find((l) => l.name === "Sundarbans")?.conditionCode).toBe(
      "showers",
    )
  })

  it("never shows a Kolkata thunderstorm/storm condition for the distant Darjeeling hill station", () => {
    const result = computeLocations({
      temperature: 32,
      condition: "Thunderstorm",
      conditionCode: "thunderstorm",
    })
    const darjeeling = result.find((l) => l.name === "Darjeeling")!
    expect(darjeeling.conditionCode).not.toBe("thunderstorm")
  })

  it("uses a distinct curated condition override for climatically distant hill-station locations", () => {
    const result = computeLocations({
      temperature: 32,
      condition: "Thunderstorm",
      conditionCode: "thunderstorm",
    })
    const darjeeling = result.find((l) => l.name === "Darjeeling")!
    const siliguri = result.find((l) => l.name === "Siliguri")!
    expect(darjeeling.condition).not.toBe("Thunderstorm")
    expect(siliguri.condition).not.toBe("Thunderstorm")
    expect(darjeeling.conditionCode).not.toBe("thunderstorm")
    expect(siliguri.conditionCode).not.toBe("thunderstorm")
  })
})
