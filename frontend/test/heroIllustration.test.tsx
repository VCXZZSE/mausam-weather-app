import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { HomeTab } from "../src/App"
import type { Profile } from "../src/App"
import {
  DEMO_WEATHER_DATA,
  getWeatherHeroVariant,
} from "@/services/weatherData"
import type { DashboardWeatherData } from "@/services/weatherData"

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

// The demo payload's sunset is 6:14 PM and HomeTab falls back to the wall
// clock, so a daytime case needs a fixed "now" to be deterministic.
const NOON = new Date(2026, 8, 18, 12, 0, 0)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOON)
  // HomeTab mounts OfficialAdvisories, which fetches; it renders a failed
  // state quietly, and the hero does not depend on it.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function renderHero(
  condition: string,
  conditionCode: string,
  isDay: boolean,
  // omitHeroVariant reproduces a demo or pre-v0.2 payload; the live API
  // always sends the field (lib/normalizers/toDashboardWeatherData.ts).
  { omitHeroVariant = false } = {},
) {
  const heroVariant = omitHeroVariant
    ? undefined
    : getWeatherHeroVariant(conditionCode, condition, isDay)
  const weather: DashboardWeatherData = {
    ...DEMO_WEATHER_DATA,
    current: {
      ...DEMO_WEATHER_DATA.current,
      condition,
      conditionCode,
      isDay,
      heroVariant,
    },
  }
  const { container } = render(
    <HomeTab
      profile={PROFILE}
      location={LOCATION}
      theme="dark"
      setTheme={() => {}}
      onOpenPersonalized={() => {}}
      onOpenMenu={() => {}}
      menuOpen={false}
      weather={weather}
    />,
  )
  const companion = container.querySelector(".weather-companion")!
  return {
    companion,
    illustration: companion.querySelector(".cloud-character-rain")
      ? "rain"
      : companion.querySelector(".cloud-character-overcast")
        ? "overcast"
        : companion.querySelector(".moon-buddy")
          ? "moon"
          : companion.querySelector(".sun-buddy-image")
            ? "sun"
            : "none",
    phase: companion
      .querySelector(".cloud-character-overcast")
      ?.getAttribute("data-overcast-phase"),
  }
}

describe("hero illustration routing", () => {
  it("shows the cloud, not the moon, for an overcast night", () => {
    const hero = renderHero("Overcast", "overcast", false)
    expect(hero.illustration).toBe("overcast")
    expect(hero.companion.querySelector(".moon-buddy")).toBeNull()
    expect(hero.phase).toBe("night")
  })

  it("shows the cloud for an overcast day", () => {
    const hero = renderHero("Overcast", "overcast", true)
    expect(hero.illustration).toBe("overcast")
    expect(hero.phase).toBe("day")
  })

  it("still shows the moon for a clear night", () => {
    expect(renderHero("Clear sky", "clear", false).illustration).toBe("moon")
  })

  it("still shows the sun for a clear day", () => {
    expect(renderHero("Clear sky", "clear", true).illustration).toBe("sun")
  })

  it("keeps rain ahead of overcast in either daylight state", () => {
    expect(renderHero("Moderate rain", "rain", true).illustration).toBe("rain")
    expect(renderHero("Moderate rain", "rain", false).illustration).toBe("rain")
  })

  it("keeps the rain illustration for a thunderstorm at night", () => {
    expect(renderHero("Thunderstorm", "thunderstorm", false).illustration).toBe(
      "rain",
    )
  })

  // Real providers spell this four different ways; none may reach overcast.
  it.each([
    ["Partly cloudy", "partly_cloudy"],
    ["Partly Cloudy", "partly_cloudy"],
    ["partly-cloudy", "partly-cloudy"],
    ["partly_cloudy", "partly_cloudy"],
  ])("keeps partly cloudy on the sun / moon: %s", (condition, code) => {
    expect(renderHero(condition, code, true).illustration).toBe("sun")
    expect(renderHero(condition, code, false).illustration).toBe("moon")
  })

  it.each([
    ["Fog", "fog"],
    ["Foggy", "fog"],
    ["Depositing rime fog", "fog"],
    ["Mist", "mist"],
    ["Haze", "haze"],
  ])("keeps fog, mist and haze in the overcast bucket: %s", (condition, code) => {
    expect(renderHero(condition, code, true).illustration).toBe("overcast")
    expect(renderHero(condition, code, false).illustration).toBe("overcast")
  })

  it("still routes a fully covered sky to overcast", () => {
    for (const [condition, code] of [
      ["Overcast", "overcast"],
      ["Cloudy", "cloudy"],
      ["Mostly cloudy", "cloudy"],
    ] as const) {
      expect(renderHero(condition, code, true).illustration).toBe("overcast")
      expect(renderHero(condition, code, false).illustration).toBe("overcast")
    }
  })

  it("keeps fog behind rain when a payload carries both", () => {
    expect(renderHero("Foggy Rain", "fog", true).illustration).toBe("rain")
  })

  it("labels the overcast illustration rather than announcing sun or moon", () => {
    expect(
      renderHero("Overcast", "overcast", false).companion.getAttribute(
        "aria-label",
      ),
    ).toBe("Animated smiling cloud")
  })

  // Pre-existing, unchanged by the reorder: without heroVariant the night
  // check in HomeTab outranks the rain check, despite the comment above it
  // claiming rain wins in either daylight state. Live payloads always carry
  // the field, so this only affects demo and pre-v0.2 data.
  it("falls back to the night illustration for rain when heroVariant is absent", () => {
    expect(
      renderHero("Moderate rain", "rain", false, { omitHeroVariant: true })
        .illustration,
    ).toBe("moon")
  })
})

describe("overcast hero art", () => {
  it("draws the sun by day and the moon by night, both faceless", () => {
    const day = renderHero("Overcast", "overcast", true).companion
    expect(day.querySelector("#overcastDiscGrad")).not.toBeNull()
    const dayDisc = day.querySelector(".overcast-disc")!
    // Craters mark the moon; the day disc has none, and neither has a face.
    expect(dayDisc.querySelectorAll("circle")).toHaveLength(2)
    expect(dayDisc.querySelector(".overcast-eyes")).toBeNull()
    expect(dayDisc.querySelector("path")).toBeNull()

    const night = renderHero("Overcast", "overcast", false).companion
    const nightDisc = night.querySelector(".overcast-disc")!
    expect(nightDisc.querySelectorAll("circle")).toHaveLength(4)
    expect(nightDisc.querySelector(".overcast-eyes")).toBeNull()
    expect(nightDisc.querySelector("path")).toBeNull()
  })

  it("dims the disc, and breathes on a nested group so the two multiply", () => {
    const hero = renderHero("Overcast", "overcast", false).companion
    const disc = hero.querySelector(".overcast-disc")!
    expect(Number(disc.getAttribute("opacity"))).toBeLessThan(1)
    // The animated group must be inside the dimmed one, not the same node.
    expect(disc.querySelector(".overcast-disc-breathe")).not.toBeNull()
    expect(disc.classList.contains("overcast-disc-breathe")).toBe(false)
  })

  it("puts the face on the cloud and carries every animation hook", () => {
    const hero = renderHero("Overcast", "overcast", true).companion
    const cloud = hero.querySelector(".overcast-cloud")!
    expect(cloud.querySelector(".overcast-eyes")).not.toBeNull()
    expect(cloud.querySelector("path[stroke-linecap=round]")).not.toBeNull()
    for (const hook of [
      ".overcast-cloud",
      ".overcast-cloud-bob",
      ".overcast-cloud-back",
      ".overcast-eyes",
      ".overcast-disc-breathe",
    ]) {
      expect(hero.querySelector(hook)).not.toBeNull()
    }
  })
})

// vitest runs with css: false, so the stylesheet never reaches the DOM. These
// two constraints (WebView-safe properties, reduced-motion fallback) are only
// visible in the source, so assert them there.
describe("overcast hero stylesheet", () => {
  const css = readFileSync(
    resolve(process.cwd(), "frontend/src/index.css"),
    "utf8",
  )
  const block = css.slice(css.indexOf("/* ── Overcast hero character"))

  it("animates transform and opacity only", () => {
    const declarations = block
      .split("\n")
      .filter(line => /^\s+\d+%|^\s+0%/.test(line))
      .join("\n")

    expect(declarations).toMatch(/transform:|opacity:/)
    expect(declarations).not.toMatch(
      /(width|height|top|left|margin|box-shadow|filter|background):/,
    )
  })

  it("scopes every rule to the hero character", () => {
    for (const hook of [
      ".overcast-cloud",
      ".overcast-cloud-bob",
      ".overcast-cloud-back",
      ".overcast-eyes",
      ".overcast-disc-breathe",
    ]) {
      expect(block).toContain(".cloud-character-overcast " + hook)
    }
  })

  it("falls back to a static illustration under prefers-reduced-motion", () => {
    const reduced = block.slice(
      block.indexOf("@media (prefers-reduced-motion: reduce)"),
    )
    expect(reduced).toContain("animation: none")
    for (const hook of [
      ".overcast-cloud",
      ".overcast-cloud-bob",
      ".overcast-cloud-back",
      ".overcast-eyes",
      ".overcast-disc-breathe",
    ]) {
      expect(reduced).toContain(hook)
    }
  })
})
