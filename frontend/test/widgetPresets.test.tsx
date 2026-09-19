import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { DEMO_WEATHER_DATA } from "@/services/weatherData"
import type { DashboardWeatherData } from "@/services/weatherData"
import { resolveWidgetPreset } from "@/widgets/widgetBridge"
import {
  DrizzleWidget,
  FogNightWidget,
  FogWidget,
  HeavyRainWidget,
  MoonWidget,
  OvercastNightWidget,
  OvercastWidget,
  SunnyWidget,
  ThunderstormWidget,
} from "@/widgets/presets"

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// The demo payload's sunset is 6:14 PM, and resolveWidgetPreset falls back to
// the wall clock, so both sides of the day/night split need a fixed "now".
const DAY = new Date(2026, 8, 18, 12, 0, 0)
const NIGHT = new Date(2026, 8, 18, 22, 0, 0)

function at(moment: Date) {
  vi.useFakeTimers()
  vi.setSystemTime(moment)
}

function weatherWith(
  condition: string,
  conditionCode: string,
): DashboardWeatherData {
  return {
    ...DEMO_WEATHER_DATA,
    current: { ...DEMO_WEATHER_DATA.current, condition, conditionCode },
  }
}

const WIDGET_DATA = {
  temperature: "24°",
  location: "Kolkata",
  condition: "Overcast",
  hi: "27°",
  lo: "21°",
}

describe("resolveWidgetPreset — overcast presets", () => {
  it("uses the overcast preset for a fully covered daytime sky", () => {
    at(DAY)
    expect(resolveWidgetPreset(weatherWith("Overcast", "overcast"))).toBe(
      "overcast",
    )
    expect(resolveWidgetPreset(weatherWith("Cloudy", "cloudy"))).toBe(
      "overcast",
    )
  })

  it("uses the night overcast preset for the same sky after dark", () => {
    at(NIGHT)
    expect(resolveWidgetPreset(weatherWith("Overcast", "overcast"))).toBe(
      "overcast-night",
    )
    expect(resolveWidgetPreset(weatherWith("Cloudy", "cloudy"))).toBe(
      "overcast-night",
    )
  })

  it.each([
    ["Partly cloudy", "partly_cloudy"],
    ["Partly Cloudy", "partly_cloudy"],
    ["partly-cloudy", "partly-cloudy"],
    ["partly_cloudy", "partly_cloudy"],
  ])("leaves partly cloudy on the sun / moon presets: %s", (condition, code) => {
    at(DAY)
    expect(resolveWidgetPreset(weatherWith(condition, code))).toBe("sunny")
    at(NIGHT)
    expect(resolveWidgetPreset(weatherWith(condition, code))).toBe("moon")
  })

  it("puts fog, mist, haze and smoke on the fog preset, matching the hero", () => {
    at(DAY)
    for (const [condition, code] of [
      ["Fog", "fog"],
      ["Foggy", "fog"],
      ["Depositing rime fog", "fog"],
      ["Mist", "mist"],
      ["Haze", "haze"],
      ["Smoke", "smoke"],
    ] as const) {
      expect(resolveWidgetPreset(weatherWith(condition, code))).toBe("fog")
    }
    at(NIGHT)
    expect(resolveWidgetPreset(weatherWith("Fog", "fog"))).toBe("fog-night")
    expect(resolveWidgetPreset(weatherWith("Smoke", "smoke"))).toBe("fog-night")
  })

  it("leaves a fully covered sky on overcast, not fog", () => {
    at(DAY)
    for (const [condition, code] of [
      ["Overcast", "overcast"],
      ["Cloudy", "cloudy"],
      ["Mostly cloudy", "cloudy"],
    ] as const) {
      expect(resolveWidgetPreset(weatherWith(condition, code))).toBe("overcast")
    }
  })

  // Rain still outranks fog. Which rain preset it gets changed with the
  // split: "Foggy Rain" carries no intensity word, so it drizzles rather
  // than taking the thunderstorm preset it got when one preset served the
  // whole rain family.
  it("keeps fog behind rain when a payload carries both", () => {
    at(DAY)
    expect(resolveWidgetPreset(weatherWith("Foggy Rain", "fog"))).toBe(
      "drizzle",
    )
  })

  it("leaves every other condition's preset unchanged", () => {
    at(DAY)
    expect(resolveWidgetPreset(weatherWith("Clear sky", "clear"))).toBe("sunny")
    expect(resolveWidgetPreset(weatherWith("Snow", "snow"))).toBe("sunny")
    at(NIGHT)
    expect(resolveWidgetPreset(weatherWith("Clear sky", "clear"))).toBe("moon")
    expect(resolveWidgetPreset(weatherWith("Thunderstorm", "thunderstorm"))).toBe(
      "thunderstorm",
    )
  })
})

describe("resolveWidgetPreset — the rain family split", () => {
  // Neither preset has a night variant, matching thunderstorm, so every row
  // is asserted in both daylight states and expected to be identical.
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
    at(DAY)
    expect(resolveWidgetPreset(weatherWith(condition, code))).toBe(expected)
    at(NIGHT)
    expect(resolveWidgetPreset(weatherWith(condition, code))).toBe(expected)
  })

  // 51/53/55 used to fall past the rain branch entirely and come out sunny
  // by day and moon by night; the split brought them into the family.
  it("no longer sends drizzle to the sun or the moon", () => {
    at(DAY)
    expect(resolveWidgetPreset(weatherWith("Light drizzle", "drizzle"))).not.toBe(
      "sunny",
    )
    at(NIGHT)
    expect(resolveWidgetPreset(weatherWith("Light drizzle", "drizzle"))).not.toBe(
      "moon",
    )
  })

  it("leaves thunderstorm routing untouched", () => {
    for (const [condition, code] of [
      ["Thunderstorm", "thunderstorm"],
      ["Thunderstorm with hail", "storm"],
      ["Severe thunderstorm with hail", "storm"],
    ] as const) {
      at(DAY)
      expect(resolveWidgetPreset(weatherWith(condition, code))).toBe(
        "thunderstorm",
      )
      at(NIGHT)
      expect(resolveWidgetPreset(weatherWith(condition, code))).toBe(
        "thunderstorm",
      )
    }
  })
})

describe("OvercastWidget / OvercastNightWidget", () => {
  it.each([
    ["day", OvercastWidget],
    ["night", OvercastNightWidget],
  ] as const)("renders the supplied weather data (%s)", (_phase, Widget) => {
    const { container } = render(<Widget data={WIDGET_DATA} mode="dark" />)

    expect(screen.getByText("Kolkata")).toBeInTheDocument()
    expect(screen.getByText("Overcast")).toBeInTheDocument()
    expect(screen.getByText("24°")).toBeInTheDocument()
    expect(screen.getByText("H: 27°")).toBeInTheDocument()
    expect(screen.getByText("L: 21°")).toBeInTheDocument()

    const card = container.firstElementChild as HTMLElement
    expect(card).toHaveStyle({ width: "170px", height: "170px" })
  })

  it("renders the new glassmorphic multi-layered cloud icon and mist line", () => {
    const { container } = render(
      <OvercastWidget data={WIDGET_DATA} mode="dark" />,
    )
    const svg = container.querySelector("svg")!

    expect(svg.querySelector(".overcast-cloud-front")).not.toBeNull()
    expect(svg.querySelector(".overcast-cloud-back")).not.toBeNull()
    expect(svg.querySelector(".mist-line")).not.toBeNull()
  })

  it("applies phase-appropriate gradients for day and night", () => {
    const { container: day } = render(
      <OvercastWidget data={WIDGET_DATA} mode="dark" />,
    )
    expect(day.querySelector("#overcast-back-day")).not.toBeNull()
    expect(day.querySelector("#overcast-front-day")).not.toBeNull()

    cleanup()

    const { container: night } = render(
      <OvercastNightWidget data={WIDGET_DATA} mode="dark" />,
    )
    expect(night.querySelector("#overcast-back-night")).not.toBeNull()
    expect(night.querySelector("#overcast-front-night")).not.toBeNull()
  })
})

describe("SunnyWidget, ThunderstormWidget, MoonWidget", () => {
  it("renders SunnyWidget with sun icon, aura, and rays ring", () => {
    const { container } = render(<SunnyWidget data={WIDGET_DATA} mode="dark" />)
    expect(screen.getByText("Kolkata")).toBeInTheDocument()
    const svg = container.querySelector("svg")!
    expect(svg.querySelector(".sun-core")).not.toBeNull()
    expect(svg.querySelector(".sun-aura")).not.toBeNull()
    expect(svg.querySelector(".sun-rays-ring")).not.toBeNull()
  })

  it("renders ThunderstormWidget with storm clouds and lightning bolt", () => {
    const { container } = render(<ThunderstormWidget data={WIDGET_DATA} mode="dark" />)
    expect(screen.getByText("Kolkata")).toBeInTheDocument()
    const svg = container.querySelector("svg")!
    expect(svg.querySelector(".cloud-main")).not.toBeNull()
    expect(svg.querySelector(".lightning-bolt")).not.toBeNull()
    expect(svg.querySelectorAll(".svg-rain-drop").length).toBeGreaterThan(0)
  })

  it("renders MoonWidget with stars and crescent mask", () => {
    const { container } = render(<MoonWidget data={WIDGET_DATA} mode="dark" />)
    expect(screen.getByText("Kolkata")).toBeInTheDocument()
    const svg = container.querySelector("svg")!
    expect(svg.querySelector(".moon-body")).not.toBeNull()
    expect(svg.querySelector(".moon-aura")).not.toBeNull()
    expect(svg.querySelector("#crescent-mask")).not.toBeNull()
  })
})

describe("FogWidget / FogNightWidget", () => {
  it.each([
    ["day", FogWidget],
    ["night", FogNightWidget],
  ] as const)("renders the supplied weather data (%s)", (_phase, Widget) => {
    const { container } = render(<Widget data={WIDGET_DATA} mode="dark" />)

    expect(screen.getByText("Kolkata")).toBeInTheDocument()
    expect(screen.getByText("24°")).toBeInTheDocument()
    expect(screen.getByText("H: 27°")).toBeInTheDocument()
    expect(screen.getByText("L: 21°")).toBeInTheDocument()

    const card = container.firstElementChild as HTMLElement
    expect(card).toHaveStyle({ width: "170px", height: "170px" })
  })

  it("draws the cloud with fog bands and no sun or moon", () => {
    const { container } = render(<FogWidget data={WIDGET_DATA} mode="dark" />)
    const svg = container.querySelector("svg")!

    expect(svg.querySelector(".fog-cloud-front")).not.toBeNull()
    expect(svg.querySelector(".fog-cloud-back")).not.toBeNull()
    expect(svg.querySelectorAll(".fog-band").length).toBeGreaterThanOrEqual(3)
  })

  it("splits each band's opacity attribute from its animated group", () => {
    const { container } = render(<FogWidget data={WIDGET_DATA} mode="dark" />)
    for (const band of container.querySelectorAll(".fog-band")) {
      expect(Number(band.getAttribute("opacity"))).toBeLessThan(1)
      const drift = band.querySelector(".fog-band-drift")!
      expect(drift).not.toBeNull()
      expect(drift.getAttribute("opacity")).toBeNull()
    }
  })

  it("applies phase-appropriate gradients for day and night", () => {
    const { container: day } = render(
      <FogWidget data={WIDGET_DATA} mode="dark" />,
    )
    expect(day.querySelector("#fog-back-day")).not.toBeNull()
    expect(day.querySelector("#fog-front-day")).not.toBeNull()

    cleanup()

    const { container: night } = render(
      <FogNightWidget data={WIDGET_DATA} mode="dark" />,
    )
    expect(night.querySelector("#fog-back-night")).not.toBeNull()
    expect(night.querySelector("#fog-front-night")).not.toBeNull()
  })
})

describe("DrizzleWidget / HeavyRainWidget", () => {
  it.each([
    ["drizzle", DrizzleWidget],
    ["heavy rain", HeavyRainWidget],
  ] as const)("renders the supplied weather data (%s)", (_name, Widget) => {
    const { container } = render(<Widget data={WIDGET_DATA} mode="dark" />)

    expect(screen.getByText("Kolkata")).toBeInTheDocument()
    expect(screen.getByText("24°")).toBeInTheDocument()
    expect(screen.getByText("H: 27°")).toBeInTheDocument()
    expect(screen.getByText("L: 21°")).toBeInTheDocument()

    const card = container.firstElementChild as HTMLElement
    expect(card).toHaveStyle({ width: "170px", height: "170px" })
  })

  it("drops more rain on the heavy tile than the drizzle tile", () => {
    const { container: light } = render(
      <DrizzleWidget data={WIDGET_DATA} mode="dark" />,
    )
    const lightDrops = light.querySelectorAll(".svg-drizzle-drop").length
    expect(lightDrops).toBe(3)
    cleanup()

    const { container: heavy } = render(
      <HeavyRainWidget data={WIDGET_DATA} mode="dark" />,
    )
    const heavyDrops = heavy.querySelectorAll(".svg-heavy-rain-drop").length
    expect(heavyDrops).toBeGreaterThan(lightDrops)
  })

  it("shares the thunderstorm tile's cloud so the three read as one set", () => {
    const { container: storm } = render(
      <ThunderstormWidget data={WIDGET_DATA} mode="dark" />,
    )
    const body = storm.querySelector(".cloud-main path")!.getAttribute("d")
    cleanup()

    for (const [Widget, hook] of [
      [DrizzleWidget, ".drizzle-cloud-main"],
      [HeavyRainWidget, ".heavy-rain-cloud-main"],
    ] as const) {
      const { container } = render(<Widget data={WIDGET_DATA} mode="dark" />)
      expect(container.querySelector(`${hook} path`)!.getAttribute("d")).toBe(
        body,
      )
      cleanup()
    }
  })
})
