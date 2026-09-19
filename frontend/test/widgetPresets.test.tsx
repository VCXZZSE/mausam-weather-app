import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { DEMO_WEATHER_DATA } from "@/services/weatherData"
import type { DashboardWeatherData } from "@/services/weatherData"
import { resolveWidgetPreset } from "@/widgets/widgetBridge"
import {
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

  it("puts fog, mist and haze on the overcast preset, matching the hero", () => {
    at(DAY)
    for (const [condition, code] of [
      ["Fog", "fog"],
      ["Foggy", "fog"],
      ["Depositing rime fog", "fog"],
      ["Mist", "mist"],
      ["Haze", "haze"],
    ] as const) {
      expect(resolveWidgetPreset(weatherWith(condition, code))).toBe("overcast")
    }
    at(NIGHT)
    expect(resolveWidgetPreset(weatherWith("Fog", "fog"))).toBe(
      "overcast-night",
    )
  })

  it("keeps fog behind rain when a payload carries both", () => {
    at(DAY)
    expect(resolveWidgetPreset(weatherWith("Foggy Rain", "fog"))).toBe(
      "thunderstorm",
    )
  })

  it("leaves every other condition's preset unchanged", () => {
    at(DAY)
    expect(resolveWidgetPreset(weatherWith("Clear sky", "clear"))).toBe("sunny")
    expect(resolveWidgetPreset(weatherWith("Moderate rain", "rain"))).toBe(
      "thunderstorm",
    )
    expect(resolveWidgetPreset(weatherWith("Snow", "snow"))).toBe("sunny")
    at(NIGHT)
    expect(resolveWidgetPreset(weatherWith("Clear sky", "clear"))).toBe("moon")
    expect(resolveWidgetPreset(weatherWith("Thunderstorm", "thunderstorm"))).toBe(
      "thunderstorm",
    )
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
