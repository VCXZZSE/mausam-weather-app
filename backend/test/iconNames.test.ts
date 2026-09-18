import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve, sep } from "node:path"
import { normalizeCpcbAirQuality } from "../src/normalizers/cpcbAqi.js"
import { computeComfort, computeOverview } from "../src/normalizers/derived.js"
import { cpcbRecords } from "./cpcbFixtures.js"

// The `icon` fields in the API response are icon *names* the frontend looks up
// in its registry, not emoji. Emoji rendered inconsistently across platform
// fonts, could not be themed, and forced the translation layer to strip them
// off every string before it could match a key.
//
// These tests guard the wire format at its source.

const REPO = resolve(__dirname, "..", "..")

/** Any non-ASCII pictograph — the thing that must not come back. */
const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{2660}-\u{2667}]/u

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (entry.endsWith(".ts")) out.push(full)
  }
  return out
}

describe("icon fields carry names, not emoji", () => {
  // Both trees: lib/ is what the serverless deployment serves.
  const files = [
    ...walk(join(REPO, "backend", "src")),
    ...walk(join(REPO, "lib")),
  ].map((f) => relative(REPO, f).split(sep).join("/"))

  it.each(files)("%s", (rel) => {
    const source = readFileSync(join(REPO, rel), "utf8")
    const offenders = source
      .split("\n")
      .map((line, i) => ({ line: line.trim(), number: i + 1 }))
      .filter(({ line }) => /\bicon:\s*"/.test(line) && EMOJI.test(line))
      .map(({ line, number }) => `${number}: ${line}`)

    expect(
      offenders,
      "emoji in an icon field — use a name from the frontend icon registry",
    ).toEqual([])
  })
})

describe("computeComfort", () => {
  it("names the band rather than picking a face", () => {
    expect(
      computeComfort({ temperature: 10, humidity: 50, windSpeed: 8 }).icon,
    ).toBe("cold")
    expect(
      computeComfort({ temperature: 22, humidity: 45, windSpeed: 8 }).icon,
    ).toBe("comfortable")
    expect(
      computeComfort({ temperature: 41, humidity: 85, windSpeed: 8 }).icon,
    ).toBe("hot")
  })

  // "too cold" and "too hot" can score the same on the index, so the icon is
  // the only thing that separates them downstream (see ComfortIndicator).
  it("distinguishes cold from hot when the label cannot", () => {
    const cold = computeComfort({ temperature: 8, humidity: 90, windSpeed: 8 })
    const hot = computeComfort({ temperature: 42, humidity: 90, windSpeed: 8 })
    expect(cold.label).toBe(hot.label)
    expect(cold.icon).toBe("cold")
    expect(hot.icon).toBe("hot")
  })
})

describe("computeOverview", () => {
  it("names every focus tile icon", () => {
    const tiles = computeOverview({
      aqiIndex: 40,
      aqiLabel: "Good",
      uvIndex: 3,
      uvLabel: "Moderate",
      rainChanceToday: 20,
      windSpeed: 9,
      bestWindowLabel: "6–8 AM",
    })
    expect(tiles.map((tile) => tile.icon)).toEqual([
      "heart",
      "trending-up",
      "commute",
      "home",
    ])
  })
})

describe("CPCB AQI bands", () => {
  const KOLKATA = { latitude: 22.5726, longitude: 88.3639 }

  it.each([
    [50, "aqi-good"],
    [51, "aqi-satisfactory"],
    [100, "aqi-satisfactory"],
    [101, "aqi-moderate"],
    [200, "aqi-moderate"],
    [201, "aqi-poor"],
    [300, "aqi-poor"],
    [301, "aqi-very-poor"],
    [400, "aqi-very-poor"],
    [401, "aqi-severe"],
  ])("names AQI %s as %s", (index, icon) => {
    expect(
      normalizeCpcbAirQuality(
        cpcbRecords({ pollutant_avg: String(index) }),
        KOLKATA,
        50,
      )?.icon,
    ).toBe(icon)
  })
})
