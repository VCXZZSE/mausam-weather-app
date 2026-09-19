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

// Checked in order: the thunderstorm hero renders .cloud-character-rain and
// .cloud-character-storm together, so it must be matched before the two
// single-character rain presets.
const ILLUSTRATIONS = [
  [".cloud-character-rain", "rain"],
  [".cloud-character-drizzle", "drizzle"],
  [".cloud-character-heavy-rain", "heavy-rain"],
  [".cloud-character-fog", "fog"],
  [".cloud-character-overcast", "overcast"],
  [".moon-buddy", "moon"],
  [".sun-buddy-image", "sun"],
] as const

function namedIllustration(companion: Element): string {
  for (const [selector, name] of ILLUSTRATIONS) {
    if (companion.querySelector(selector)) return name
  }
  return "none"
}

function renderHero(
  condition: string,
  conditionCode: string,
  isDay: boolean,
  // omitHeroVariant reproduces a demo or pre-v0.2 payload; the live API
  // always sends the field (lib/normalizers/toDashboardWeatherData.ts).
  { omitHeroVariant = false, theme = "dark" as "dark" | "light" } = {},
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
      theme={theme}
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
    illustration: namedIllustration(companion),
    phase:
      companion
        .querySelector(".cloud-character-overcast")
        ?.getAttribute("data-overcast-phase") ??
      companion
        .querySelector(".cloud-character-fog")
        ?.getAttribute("data-fog-phase"),
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

  // Still rain-family-first; which of the three rain characters it picks is
  // the split's business, and WMO 63 is on the heavy side.
  it("keeps rain ahead of overcast in either daylight state", () => {
    expect(renderHero("Moderate rain", "rain", true).illustration).toBe(
      "heavy-rain",
    )
    expect(renderHero("Moderate rain", "rain", false).illustration).toBe(
      "heavy-rain",
    )
  })

  it.each([
    ["Light drizzle", "drizzle", "drizzle"],
    ["Moderate drizzle", "drizzle", "drizzle"],
    ["Dense drizzle", "drizzle", "drizzle"],
    ["Slight rain", "rain", "drizzle"],
    ["Slight showers", "showers", "drizzle"],
    ["Moderate rain", "rain", "heavy-rain"],
    ["Heavy rain", "heavy_rain", "heavy-rain"],
    ["Violent showers", "heavy_rain", "heavy-rain"],
  ])("splits the rain family by intensity: %s", (condition, code, expected) => {
    expect(renderHero(condition, code, true).illustration).toBe(expected)
    expect(renderHero(condition, code, false).illustration).toBe(expected)
  })

  // "Moderate drizzle" must not be dragged onto the heavy character by the
  // word "moderate" — only "moderate rain" and "moderate showers" are heavy.
  it("keeps moderate drizzle on the drizzle character", () => {
    expect(renderHero("Moderate drizzle", "drizzle", true).illustration).toBe(
      "drizzle",
    )
  })

  it("leaves the thunderstorm character untouched by the split", () => {
    for (const [condition, code] of [
      ["Thunderstorm", "thunderstorm"],
      ["Thunderstorm with hail", "storm"],
      ["Severe thunderstorm with hail", "storm"],
    ] as const) {
      expect(renderHero(condition, code, true).illustration).toBe("rain")
      expect(renderHero(condition, code, false).illustration).toBe("rain")
    }
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

  // Fog, mist, haze and smoke left the overcast bucket for their own
  // character. All four spellings are matched on both sides of the app, so
  // the hero and widgetBridge's resolver agree on the whole family — "smoke"
  // used to reach only the widget.
  it.each([
    ["Fog", "fog"],
    ["Foggy", "fog"],
    ["Depositing rime fog", "fog"],
    ["Mist", "mist"],
    ["Haze", "haze"],
    ["Smoke", "smoke"],
  ])("gives fog, mist, haze and smoke their own character: %s", (condition, code) => {
    expect(renderHero(condition, code, true).illustration).toBe("fog")
    expect(renderHero(condition, code, false).illustration).toBe("fog")
  })

  it("keeps the phase on the fog character in either daylight state", () => {
    expect(renderHero("Fog", "fog", true).phase).toBe("day")
    expect(renderHero("Fog", "fog", false).phase).toBe("night")
  })

  // A sky that reports both reads as fog: it is the one that actually
  // changes what you can see.
  it("puts fog ahead of overcast when a payload carries both", () => {
    expect(renderHero("Overcast fog", "overcast", true).illustration).toBe(
      "fog",
    )
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

  // Rain still outranks fog. Which rain character it gets changed with the
  // split: "Foggy Rain" carries no intensity word, so it drizzles rather
  // than taking the thunderstorm art it got when one preset served the
  // whole rain family.
  it("keeps fog behind rain when a payload carries both", () => {
    expect(renderHero("Foggy Rain", "fog", true).illustration).toBe("drizzle")
  })

  it("labels the overcast illustration rather than announcing sun or moon", () => {
    expect(
      renderHero("Overcast", "overcast", false).companion.getAttribute(
        "aria-label",
      ),
    ).toBe("Animated smiling cloud")
  })

  it("gives the fog illustration its own label, not the overcast one", () => {
    expect(
      renderHero("Fog", "fog", false).companion.getAttribute("aria-label"),
    ).toBe("Animated sleepy cloud in drifting fog")
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

describe("fog hero art", () => {
  // "Same art family as the overcast cloud": the fog character is that
  // cloud's body, moved down, not a second silhouette. Comparing the shapes
  // the two actually render is what keeps them from drifting apart.
  it("reuses the overcast cloud's body geometry, sitting lower", () => {
    const fog = renderHero("Fog", "fog", true).companion
    const fogLobes = fog.querySelectorAll(
      ".fog-cloud-settle g[fill^='url('] circle",
    )
    cleanup()
    const overcast = renderHero("Overcast", "overcast", true).companion
    const overcastLobes = overcast.querySelectorAll(
      ".overcast-cloud-bob g[fill^='url('] circle",
    )

    expect(fogLobes).toHaveLength(overcastLobes.length)
    for (let i = 0; i < fogLobes.length; i++) {
      expect(fogLobes[i].getAttribute("r")).toBe(overcastLobes[i].getAttribute("r"))
      expect(fogLobes[i].getAttribute("cx")).toBe(overcastLobes[i].getAttribute("cx"))
      // Same lobe, lower in the frame.
      expect(Number(fogLobes[i].getAttribute("cy"))).toBeGreaterThan(
        Number(overcastLobes[i].getAttribute("cy")),
      )
    }
  })

  it("draws no sun or moon behind the fog, in either phase", () => {
    for (const isDay of [true, false]) {
      const hero = renderHero("Fog", "fog", isDay).companion
      expect(hero.querySelector(".overcast-disc")).toBeNull()
      // The overcast disc and its glow are the only radial gradients in this
      // family; fog has neither.
      expect(hero.querySelector(".cloud-character-fog radialGradient")).toBeNull()
      cleanup()
    }
  })

  it("gives the character half-closed eyes rather than the overcast circles", () => {
    const hero = renderHero("Fog", "fog", true).companion
    const eyes = hero.querySelector(".fog-eyes")!
    expect(eyes.querySelectorAll("path")).toHaveLength(2)
    expect(eyes.querySelectorAll("circle")).toHaveLength(0)
  })

  it("drifts fog bands across the body, one of them over the face", () => {
    const hero = renderHero("Fog", "fog", true).companion
    const bands = hero.querySelectorAll(".fog-band")
    expect(bands.length).toBeGreaterThanOrEqual(3)

    const eyeTop = Number(
      hero.querySelector(".fog-eyes path")!.getAttribute("d")!.match(/M[\d.]+ ([\d.]+)/)![1],
    )
    const overFace = [...bands].some(band => {
      const rect = band.querySelector("rect")!
      const y = Number(rect.getAttribute("y"))
      return y <= eyeTop + 8 && y + Number(rect.getAttribute("height")) >= eyeTop
    })
    expect(overFace).toBe(true)

    // Wider than the viewBox on both sides so they always span the box at
    // either drift extreme; the fade is the mask's job, not the clip's.
    for (const band of bands) {
      const rect = band.querySelector("rect")!
      expect(Number(rect.getAttribute("x"))).toBeLessThan(0)
      expect(
        Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")),
      ).toBeGreaterThan(140)
    }
  })

  it("splits each band's opacity attribute from its animated group", () => {
    const hero = renderHero("Fog", "fog", true).companion
    for (const band of hero.querySelectorAll(".fog-band")) {
      expect(Number(band.getAttribute("opacity"))).toBeLessThan(1)
      // The animated group must be inside the dimmed one, not the same node,
      // or the CSS opacity animation overrides the attribute.
      const drift = band.querySelector(".fog-band-drift")!
      expect(drift).not.toBeNull()
      expect(band.classList.contains("fog-band-drift")).toBe(false)
      expect(drift.getAttribute("opacity")).toBeNull()
    }
  })

  it("carries every animation hook, and no transform attribute on them", () => {
    const hero = renderHero("Fog", "fog", true).companion
    for (const hook of [
      ".fog-cloud",
      ".fog-cloud-settle",
      ".fog-cloud-back",
      ".fog-eyes",
      ".fog-band-drift",
    ]) {
      const node = hero.querySelector(hook)
      expect(node).not.toBeNull()
      // A transform attribute on an animated node is overridden by the CSS
      // transform, the same trap as opacity — offsets are baked in instead.
      expect(node!.getAttribute("transform")).toBeNull()
    }
  })
})

describe("fog hero stylesheet", () => {
  const css = readFileSync(
    resolve(process.cwd(), "frontend/src/index.css"),
    "utf8",
  )
  const block = css.slice(css.indexOf("/* ── Fog hero character"))

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

  it("scopes every rule to the fog character", () => {
    for (const hook of [
      ".fog-cloud",
      ".fog-cloud-settle",
      ".fog-cloud-back",
      ".fog-eyes",
      ".fog-band-drift",
    ]) {
      expect(block).toContain(".cloud-character-fog " + hook)
    }
  })

  it("falls back to a static illustration under prefers-reduced-motion", () => {
    const reduced = block.slice(
      block.indexOf("@media (prefers-reduced-motion: reduce)"),
    )
    expect(reduced).toContain("animation: none")
    for (const hook of [
      ".fog-cloud",
      ".fog-cloud-settle",
      ".fog-cloud-back",
      ".fog-eyes",
      ".fog-band-drift",
    ]) {
      expect(reduced).toContain(hook)
    }
  })
})

describe("drizzle and heavy-rain hero art", () => {
  // Both split off the rain cloud, so both must still be that cloud — the
  // difference is the face and the drops, not a new silhouette.
  it("reuses the rain cloud's body for both new characters", () => {
    const storm = renderHero("Thunderstorm", "thunderstorm", true).companion
    const body = storm
      .querySelector(".cloud-character-rain path")!
      .getAttribute("d")
    cleanup()

    for (const [condition, code, hook] of [
      ["Light drizzle", "drizzle", ".cloud-character-drizzle"],
      ["Heavy rain", "heavy_rain", ".cloud-character-heavy-rain"],
    ] as const) {
      const hero = renderHero(condition, code, true).companion
      expect(hero.querySelector(`${hook} path`)!.getAttribute("d")).toBe(body)
      cleanup()
    }
  })

  it("gives drizzle a content face and few widely-spaced drops", () => {
    const hero = renderHero("Light drizzle", "drizzle", true).companion
    // Open circles, not the heavy character's squinting arcs.
    expect(hero.querySelectorAll(".drizzle-eyes circle")).toHaveLength(2)
    expect(hero.querySelectorAll(".drizzle-eyes path")).toHaveLength(0)

    const drops = hero.querySelectorAll(".drizzle-drop")
    expect(drops).toHaveLength(3)

    // Widely spaced: every gap wider than the heavy character's.
    const xs = [...drops].map(d => Number(d.getAttribute("d")!.match(/M([\d.]+)/)![1]))
    const gaps = xs.slice(1).map((x, i) => x - xs[i])
    expect(Math.min(...gaps)).toBeGreaterThan(15)
  })

  it("gives heavy rain a squinting face and dense drops", () => {
    const hero = renderHero("Heavy rain", "heavy_rain", true).companion
    // Arcs, not circles.
    expect(hero.querySelectorAll(".heavy-rain-eyes path")).toHaveLength(2)
    expect(hero.querySelectorAll(".heavy-rain-eyes circle")).toHaveLength(0)

    const drops = hero.querySelectorAll(".heavy-rain-drop")
    expect(drops.length).toBeGreaterThanOrEqual(8)

    const xs = [...drops].map(d => Number(d.getAttribute("d")!.match(/M([\d.]+)/)![1]))
    const gaps = xs.slice(1).map((x, i) => x - xs[i])
    expect(Math.max(...gaps)).toBeLessThan(15)
  })

  it("drops more rain on heavy than on drizzle", () => {
    const light = renderHero("Light drizzle", "drizzle", true).companion
      .querySelectorAll(".drizzle-drop").length
    cleanup()
    const heavy = renderHero("Heavy rain", "heavy_rain", true).companion
      .querySelectorAll(".heavy-rain-drop").length
    expect(heavy).toBeGreaterThan(light)
  })

  it("leaves the thunderstorm character's own markup alone", () => {
    const hero = renderHero("Thunderstorm", "thunderstorm", true).companion
    expect(hero.querySelector(".cloud-character-rain")).not.toBeNull()
    expect(hero.querySelector(".cloud-character-storm")).not.toBeNull()
    expect(hero.querySelectorAll(".cloud-drop")).toHaveLength(5)
    // Neither new character may leak into the storm hero.
    expect(hero.querySelector(".cloud-character-drizzle")).toBeNull()
    expect(hero.querySelector(".cloud-character-heavy-rain")).toBeNull()
  })
})

describe("drizzle and heavy-rain hero stylesheet", () => {
  const css = readFileSync(
    resolve(process.cwd(), "frontend/src/index.css"),
    "utf8",
  )
  const block = css.slice(
    css.indexOf("/* ── Drizzle and heavy-rain hero characters"),
  )

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

  it("scopes every rule to one of the two characters", () => {
    for (const hook of [
      ".cloud-character-drizzle .drizzle-drop",
      ".cloud-character-heavy-rain .heavy-rain-drop",
    ]) {
      expect(block).toContain(hook)
    }
  })

  it("falls back to a static illustration under prefers-reduced-motion", () => {
    const reduced = block.slice(
      block.indexOf("@media (prefers-reduced-motion: reduce)"),
    )
    expect(reduced).toContain("animation: none")
    for (const hook of [
      ".cloud-character-drizzle",
      ".drizzle-drop",
      ".cloud-character-heavy-rain",
      ".heavy-rain-drop",
    ]) {
      expect(reduced).toContain(hook)
    }
  })
})

describe("fog band fade and theme (Step D rendering fixes)", () => {
  // Defect 1. A gradient painted onto the bands travels with them as they
  // drift, so it reaches the companion's clip line still part-opaque and
  // leaves a blunt vertical edge that slides. The fade has to sit on a
  // parent that never moves.
  it("fades the bands from a mask on a static parent, not a fill on the bands", () => {
    const hero = renderHero("Fog", "fog", true).companion
    const bands = hero.querySelector(".fog-bands")!

    expect(bands.getAttribute("mask")).toBe("url(#fogBandMask)")
    // The carrier must not move, or it would drag the fade along with it.
    expect(bands.getAttribute("transform")).toBeNull()
    expect(bands.getAttribute("class")).toBe("fog-bands")
    // The bands themselves paint flat colour; nothing may re-introduce a
    // travelling gradient on them.
    for (const rect of hero.querySelectorAll(".fog-band rect")) {
      expect(rect.getAttribute("fill")).toBeNull()
    }
    expect(hero.querySelector("#fogBandGrad")).toBeNull()
  })

  it("takes the mask's alpha to zero at both edges of the viewBox", () => {
    const hero = renderHero("Fog", "fog", true).companion
    const mask = hero.querySelector("#fogBandMask")!
    // Anchored to the viewBox, not to the bands.
    expect(mask.getAttribute("maskUnits")).toBe("userSpaceOnUse")
    expect(mask.getAttribute("x")).toBe("0")
    expect(mask.getAttribute("width")).toBe("140")

    const grad = hero.querySelector("#fogBandFade")!
    expect(grad.getAttribute("gradientUnits")).toBe("userSpaceOnUse")
    expect(grad.getAttribute("x1")).toBe("0")
    expect(grad.getAttribute("x2")).toBe("140")

    const stops = [...grad.querySelectorAll("stop")].map(s => ({
      offset: s.getAttribute("offset"),
      alpha: Number(s.getAttribute("stop-opacity")),
    }))
    // Zero at both ends — which are the clip lines — and opaque between.
    expect(stops[0].alpha).toBe(0)
    expect(stops[stops.length - 1].alpha).toBe(0)
    expect(Math.max(...stops.map(s => s.alpha))).toBe(1)

    // The clip lines are x=0 and x=140. The bands span the box at either
    // drift extreme, so wherever a band ends up, the alpha it is painted
    // with at those two x positions is the mask's, which is zero.
    const rects = [...hero.querySelectorAll(".fog-band rect")]
    const DRIFT = 13
    for (const r of rects) {
      const x = Number(r.getAttribute("x"))
      const w = Number(r.getAttribute("width"))
      expect(x + DRIFT).toBeLessThanOrEqual(0)
      expect(x + w - DRIFT).toBeGreaterThanOrEqual(140)
    }
  })

  // Defect 2. A non-rainy hero card is .is-sunny / .is-night, which in
  // light mode is a cream, near-white card — a white band on it vanishes.
  it("flips the band colour to slate on the pale light-theme card", () => {
    const bandFill = (t: "dark" | "light", isDay: boolean) =>
      renderHero("Fog", "fog", isDay, { theme: t }).companion
        .querySelector(".fog-bands")!
        .getAttribute("fill")!

    for (const isDay of [true, false]) {
      const dark = bandFill("dark", isDay)
      const light = bandFill("light", isDay)
      expect(light).not.toBe(dark)
      // Light theme: dark enough to read on cream. Dark theme: near-white.
      const lum = (hex: string) =>
        parseInt(hex.slice(1, 3), 16) * 0.299 +
        parseInt(hex.slice(3, 5), 16) * 0.587 +
        parseInt(hex.slice(5, 7), 16) * 0.114
      expect(lum(light)).toBeLessThan(140)
      expect(lum(dark)).toBeGreaterThan(200)
    }
  })

  // The whole point of the preset: in light theme it must not collapse into
  // the overcast character with its sun removed.
  it("stays visibly distinct from the overcast character in light theme", () => {
    const fog = renderHero("Fog", "fog", true, { theme: "light" }).companion
    expect(fog.querySelectorAll(".fog-band").length).toBeGreaterThanOrEqual(3)
    expect(fog.querySelector(".fog-eyes path")).not.toBeNull()
    cleanup()

    const overcast = renderHero("Overcast", "overcast", true, {
      theme: "light",
    }).companion
    expect(overcast.querySelector(".fog-band")).toBeNull()
    expect(overcast.querySelector(".overcast-disc")).not.toBeNull()
  })
})
