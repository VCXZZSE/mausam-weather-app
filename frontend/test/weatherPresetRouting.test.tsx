import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { HomeTab } from "../src/App"
import type { Profile } from "../src/App"
import {
  DEMO_WEATHER_DATA,
  getWeatherHeroVariant,
} from "@/services/weatherData"
import type { DashboardWeatherData } from "@/services/weatherData"
import { resolveWidgetPreset } from "@/widgets/widgetBridge"

/**
 * Frozen routing table for both preset systems — the hero character in
 * HomeTab (frontend/src/App.tsx) and the 2x2 widget preset resolver
 * (frontend/src/widgets/widgetBridge.ts) — across every condition the app
 * maps, in both daylight states.
 *
 * This is a regression net, not a specification: EXPECTED below records what
 * the code does today, right or wrong. When a preset is added or a bucket is
 * split, only the rows that split are meant to move. A row that changes
 * without being named in that change is a regression, not a detail to absorb
 * into the table.
 *
 * Each cell is a flat string so a failure diffs line by line and names the
 * rows that moved.
 */

const LOCATION = {
  latitude: 22.5726,
  longitude: 88.3639,
  locality: "Kolkata",
  region: "West Bengal",
  country: "India",
  timezone: "Asia/Kolkata",
  source: "device" as const,
}
const PROFILE: Profile = {
  name: "Aditi",
  sensitivities: [],
  concerns: [],
  goals: ["Daily energy"],
  age: 29,
  activity: "Moderate",
  persona: "health",
}

// The demo payload's sunset is 6:14 PM and both resolvers fall back to the
// wall clock, so each daylight state needs a fixed "now". isDay is also set
// per row: live payloads always carry it, and both resolvers read it first.
const DAY = new Date(2026, 8, 18, 12, 0, 0)
const NIGHT = new Date(2026, 8, 18, 22, 0, 0)

type Row = { label: string; condition: string; code: string }

// Condition text / code pairs exactly as lib/normalizers/conditionCode.ts
// emits them, labelled by WMO code where one maps directly. "cloudy" has no
// WMO code of its own — it is the normalizer's fallback for anything
// unrecognised, and providers also send it verbatim.
const CONDITIONS: Row[] = [
  { label: "00 clear", condition: "Clear sky", code: "clear" },
  {
    label: "02 partly cloudy",
    condition: "Partly cloudy",
    code: "partly_cloudy",
  },
  { label: "03 overcast", condition: "Overcast", code: "overcast" },
  { label: "-- cloudy", condition: "Cloudy", code: "cloudy" },
  { label: "-- mostly cloudy", condition: "Mostly cloudy", code: "cloudy" },
  { label: "45 fog", condition: "Fog", code: "fog" },
  { label: "48 rime fog", condition: "Depositing rime fog", code: "fog" },
  { label: "-- mist", condition: "Mist", code: "mist" },
  { label: "-- haze", condition: "Haze", code: "haze" },
  { label: "-- smoke", condition: "Smoke", code: "smoke" },
  { label: "51 light drizzle", condition: "Light drizzle", code: "drizzle" },
  {
    label: "53 moderate drizzle",
    condition: "Moderate drizzle",
    code: "drizzle",
  },
  { label: "55 dense drizzle", condition: "Dense drizzle", code: "drizzle" },
  { label: "61 slight rain", condition: "Slight rain", code: "rain" },
  { label: "63 moderate rain", condition: "Moderate rain", code: "rain" },
  { label: "65 heavy rain", condition: "Heavy rain", code: "heavy_rain" },
  { label: "80 slight showers", condition: "Slight showers", code: "showers" },
  {
    label: "82 violent showers",
    condition: "Violent showers",
    code: "heavy_rain",
  },
  { label: "95 thunderstorm", condition: "Thunderstorm", code: "thunderstorm" },
]

function weatherFor(row: Row, isDay: boolean): DashboardWeatherData {
  return {
    ...DEMO_WEATHER_DATA,
    current: {
      ...DEMO_WEATHER_DATA.current,
      condition: row.condition,
      conditionCode: row.code,
      isDay,
      heroVariant: getWeatherHeroVariant(row.code, row.condition, isDay),
    },
  }
}

/**
 * Names the hero character by its own modifier class rather than by a fixed
 * list, so a preset added later shows up in the diff under its own name
 * instead of collapsing to "none" and hiding the move. The rain hero renders
 * two cross-fading characters, which is why several names can join.
 */
function heroCharacter(companion: Element): string {
  const names = new Set<string>()
  for (const node of companion.querySelectorAll(
    '[class*="cloud-character-"]',
  )) {
    for (const cls of node.classList) {
      if (cls.startsWith("cloud-character-")) {
        names.add(cls.slice("cloud-character-".length))
      }
    }
  }
  if (names.size) return [...names].sort().join("+")
  if (companion.querySelector(".moon-buddy")) return "moon"
  if (companion.querySelector(".sun-buddy-image")) return "sun"
  return "none"
}

/** Reads whatever data-*-phase the character carries, without naming it. */
function heroPhase(companion: Element): string {
  for (const node of companion.querySelectorAll("*")) {
    for (const attr of node.attributes) {
      if (attr.name.startsWith("data-") && attr.name.endsWith("-phase")) {
        return attr.value
      }
    }
  }
  return "-"
}

function heroRouting(row: Row, isDay: boolean) {
  const { container } = render(
    <HomeTab
      profile={PROFILE}
      location={LOCATION}
      theme="dark"
      setTheme={() => {}}
      onOpenPersonalized={() => {}}
      onOpenMenu={() => {}}
      menuOpen={false}
      weather={weatherFor(row, isDay)}
    />,
  )
  const companion = container.querySelector(".weather-companion")!
  const result = {
    hero: heroCharacter(companion),
    phase: heroPhase(companion),
    aria: companion.getAttribute("aria-label") ?? "-",
  }
  cleanup()
  return result
}

function routingTable(): Record<string, string> {
  const table: Record<string, string> = {}
  for (const [phaseName, moment, isDay] of [
    ["day", DAY, true],
    ["night", NIGHT, false],
  ] as const) {
    for (const row of CONDITIONS) {
      vi.setSystemTime(moment)
      const hero = heroRouting(row, isDay)
      const widget = resolveWidgetPreset(weatherFor(row, isDay))
      table[`${row.label} - ${phaseName}`] =
        `hero=${hero.hero} phase=${hero.phase} widget=${widget} aria=${hero.aria}`
    }
  }
  return table
}

// Frozen baseline. Every value here is current behaviour, including the one
// place where the two systems still disagree: the drizzle codes (hero rain,
// widget sunny/moon). That is recorded, not corrected, so that any later
// change to it is deliberate and visible. "smoke" used to be a second such
// place — hero sun/moon against widget overcast — and the fog split closed
// it by giving both systems the same four-spelling fog family.
const EXPECTED: Record<string, string> = {
  "00 clear - day": "hero=sun phase=- widget=sunny aria=Animated smiling sun",
  "02 partly cloudy - day":
    "hero=sun phase=- widget=sunny aria=Animated smiling sun",
  "03 overcast - day":
    "hero=overcast phase=day widget=overcast aria=Animated smiling cloud",
  "-- cloudy - day":
    "hero=overcast phase=day widget=overcast aria=Animated smiling cloud",
  "-- mostly cloudy - day":
    "hero=overcast phase=day widget=overcast aria=Animated smiling cloud",
  "45 fog - day":
    "hero=fog phase=day widget=fog aria=Animated sleepy cloud in drifting fog",
  "48 rime fog - day":
    "hero=fog phase=day widget=fog aria=Animated sleepy cloud in drifting fog",
  "-- mist - day":
    "hero=fog phase=day widget=fog aria=Animated sleepy cloud in drifting fog",
  "-- haze - day":
    "hero=fog phase=day widget=fog aria=Animated sleepy cloud in drifting fog",
  "-- smoke - day":
    "hero=fog phase=day widget=fog aria=Animated sleepy cloud in drifting fog",
  "51 light drizzle - day":
    "hero=drizzle phase=- widget=drizzle aria=Animated cloud with light drizzle",
  "53 moderate drizzle - day":
    "hero=drizzle phase=- widget=drizzle aria=Animated cloud with light drizzle",
  "55 dense drizzle - day":
    "hero=drizzle phase=- widget=drizzle aria=Animated cloud with light drizzle",
  "61 slight rain - day":
    "hero=drizzle phase=- widget=drizzle aria=Animated cloud with light drizzle",
  "63 moderate rain - day":
    "hero=heavy-rain phase=- widget=heavy-rain aria=Animated cloud squinting through heavy rain",
  "65 heavy rain - day":
    "hero=heavy-rain phase=- widget=heavy-rain aria=Animated cloud squinting through heavy rain",
  "80 slight showers - day":
    "hero=drizzle phase=- widget=drizzle aria=Animated cloud with light drizzle",
  "82 violent showers - day":
    "hero=heavy-rain phase=- widget=heavy-rain aria=Animated cloud squinting through heavy rain",
  "95 thunderstorm - day":
    "hero=rain+storm phase=- widget=thunderstorm aria=Animated rain cloud",

  "00 clear - night":
    "hero=moon phase=- widget=moon aria=Animated smiling moon",
  "02 partly cloudy - night":
    "hero=moon phase=- widget=moon aria=Animated smiling moon",
  "03 overcast - night":
    "hero=overcast phase=night widget=overcast-night aria=Animated smiling cloud",
  "-- cloudy - night":
    "hero=overcast phase=night widget=overcast-night aria=Animated smiling cloud",
  "-- mostly cloudy - night":
    "hero=overcast phase=night widget=overcast-night aria=Animated smiling cloud",
  "45 fog - night":
    "hero=fog phase=night widget=fog-night aria=Animated sleepy cloud in drifting fog",
  "48 rime fog - night":
    "hero=fog phase=night widget=fog-night aria=Animated sleepy cloud in drifting fog",
  "-- mist - night":
    "hero=fog phase=night widget=fog-night aria=Animated sleepy cloud in drifting fog",
  "-- haze - night":
    "hero=fog phase=night widget=fog-night aria=Animated sleepy cloud in drifting fog",
  "-- smoke - night":
    "hero=fog phase=night widget=fog-night aria=Animated sleepy cloud in drifting fog",
  "51 light drizzle - night":
    "hero=drizzle phase=- widget=drizzle aria=Animated cloud with light drizzle",
  "53 moderate drizzle - night":
    "hero=drizzle phase=- widget=drizzle aria=Animated cloud with light drizzle",
  "55 dense drizzle - night":
    "hero=drizzle phase=- widget=drizzle aria=Animated cloud with light drizzle",
  "61 slight rain - night":
    "hero=drizzle phase=- widget=drizzle aria=Animated cloud with light drizzle",
  "63 moderate rain - night":
    "hero=heavy-rain phase=- widget=heavy-rain aria=Animated cloud squinting through heavy rain",
  "65 heavy rain - night":
    "hero=heavy-rain phase=- widget=heavy-rain aria=Animated cloud squinting through heavy rain",
  "80 slight showers - night":
    "hero=drizzle phase=- widget=drizzle aria=Animated cloud with light drizzle",
  "82 violent showers - night":
    "hero=heavy-rain phase=- widget=heavy-rain aria=Animated cloud squinting through heavy rain",
  "95 thunderstorm - night":
    "hero=rain+storm phase=- widget=thunderstorm aria=Animated rain cloud",
}

beforeEach(() => {
  vi.useFakeTimers()
  // HomeTab mounts OfficialAdvisories, which fetches; it renders a failed
  // state quietly, and neither resolver depends on it.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("weather preset routing baseline", () => {
  it("routes every mapped condition to the same hero and widget preset as before", () => {
    expect(routingTable()).toEqual(EXPECTED)
  })
})
