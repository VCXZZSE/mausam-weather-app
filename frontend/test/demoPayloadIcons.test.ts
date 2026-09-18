import { describe, expect, it } from "vitest"
import { DEMO_WEATHER_DATA, resolveWeatherIcon } from "@/services/weatherData"
import { isIconName, resolveIconName } from "@/components/icons/iconMap"

// DEMO_WEATHER_DATA is the payload the app falls back to when it cannot reach
// the backend — which, in the packaged Android build, is what a user sees with
// no signal. If one of its icon names were wrong, that screen would render
// gaps, and no other test would notice because the live path never uses it.

/** Every `icon` value anywhere in the demo payload, with a path to it. */
function collectIcons(
  value: unknown,
  path = "",
): Array<{ path: string; icon: string }> {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => collectIcons(item, `${path}[${i}]`))
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, child]) => {
        const next = path ? `${path}.${key}` : key
        if ((key === "icon" || key.endsWith("Tone")) && typeof child === "string") {
          return [{ path: next, icon: child }]
        }
        return collectIcons(child, next)
      },
    )
  }
  return []
}

describe("DEMO_WEATHER_DATA icons", () => {
  const icons = collectIcons(DEMO_WEATHER_DATA)

  it("has icons to check", () => {
    expect(icons.length).toBeGreaterThan(20)
  })

  it("names an icon that exists, everywhere", () => {
    const broken = icons.filter(({ icon }) => !isIconName(icon))
    expect(
      broken,
      "these demo values name art that does not exist, so the offline screen would render a gap",
    ).toEqual([])
  })

  it("carries no emoji", () => {
    const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u
    expect(icons.filter(({ icon }) => EMOJI.test(icon))).toEqual([])
  })

  it("resolves every hourly, daily and nearby-location condition to weather artwork", () => {
    const rows = [
      ...DEMO_WEATHER_DATA.hourly.map((h) => ({
        code: h.conditionCode,
        icon: h.icon,
      })),
      ...DEMO_WEATHER_DATA.daily.map((d) => ({
        code: d.conditionCode,
        icon: d.icon,
      })),
      ...DEMO_WEATHER_DATA.locations.map((l) => ({
        code: l.conditionCode,
        icon: l.icon,
      })),
    ]
    expect(rows.length).toBeGreaterThan(10)
    for (const { code, icon } of rows) {
      for (const isDay of [true, false, undefined]) {
        const resolved = resolveWeatherIcon(code, icon, isDay)
        expect(isIconName(resolved), `${code}/${icon} -> ${resolved}`).toBe(true)
      }
    }
  })

  it("still renders if the payload is an older one carrying emoji", () => {
    // The shape a pre-migration cached response would have.
    const stale = { icon: "⛈️", conditionCode: "thunderstorm" }
    expect(resolveIconName(stale.icon)).toBe("thunderstorms-rain")
    expect(resolveWeatherIcon(stale.conditionCode, stale.icon, true)).toBe(
      "thunderstorms-rain",
    )
  })
})
