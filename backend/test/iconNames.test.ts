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

/** A line assigning an icon or tone field a string literal. */
const ICON_FIELD = /(?:^|[\s{,])(?:icon|[A-Za-z]+Tone):\s*"/

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (entry.endsWith(".ts")) out.push(full)
  }
  return out
}

/** Every shared module, both trees. lib/ is what the serverless side serves. */
function sharedModules(): Array<{ rel: string; source: string }> {
  const files: string[] = []
  for (const dir of [join(REPO, "backend", "src"), join(REPO, "lib")]) {
    files.push(...walk(dir))
  }
  return files.map((file) => ({
    rel: relative(REPO, file).split(sep).join("/"),
    source: readFileSync(file, "utf8"),
  }))
}

describe("icon fields carry names, not emoji", () => {
  // One sweep rather than a test per file: 64 of the 82 shared modules contain
  // no icon field at all, so a per-file assertion reported 64 passes that could
  // never have failed. This names every offender at once, which is the part
  // that is actually useful when it does fail.
  it("nowhere in backend/src or lib/", () => {
    const offenders: string[] = []
    for (const { rel, source } of sharedModules()) {
      source.split("\n").forEach((line, i) => {
        if (ICON_FIELD.test(line) && EMOJI.test(line)) {
          offenders.push(`${rel}:${i + 1}  ${line.trim()}`)
        }
      })
    }
    expect(
      offenders,
      "emoji in an icon or tone field — use a name from the frontend icon registry",
    ).toEqual([])
  })

  // Guards the sweep. An earlier version of it carried a literal backspace
  // byte where \b was meant, so ICON_FIELD matched nothing and the sweep
  // passed on an empty set; nothing noticed until a mutation test did. This
  // fails if the sweep ever stops seeing the modules it is supposed to read.
  it("actually inspected the modules that emit one", () => {
    const emitters = sharedModules()
      .filter(({ source }) =>
        source.split("\n").some((line) => ICON_FIELD.test(line)),
      )
      .map(({ rel }) => rel)

    expect(emitters.length, `only matched: ${emitters.join(", ")}`)
      .toBeGreaterThanOrEqual(14)
    // Both trees, not just one.
    expect(emitters.some((r) => r.startsWith("backend/src/"))).toBe(true)
    expect(emitters.some((r) => r.startsWith("lib/"))).toBe(true)
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

  it("pairs each comfort band with its own advice tone", () => {
    const cold = computeComfort({ temperature: 8, humidity: 90, windSpeed: 8 })
    const fine = computeComfort({ temperature: 22, humidity: 45, windSpeed: 8 })
    expect(fine.adviceTone).toBe("comfortable")
    expect(cold.adviceTone).toBe("warning")
    expect(fine.advice).not.toBe(cold.advice)
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

  const at = (index: number) =>
    normalizeCpcbAirQuality(
      cpcbRecords({ pollutant_avg: String(index) }),
      KOLKATA,
      50,
    )

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
    expect(at(index)?.icon).toBe(icon)
  })

  it("gives each band its own advice and tone, not one generic line", () => {
    const bands = [30, 80, 150, 250, 350, 450].map(at)
    expect(new Set(bands.map((b) => b?.advice)).size).toBe(6)
    expect(new Set(bands.map((b) => b?.adviceTone)).size).toBe(6)
  })
})
