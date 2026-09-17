import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import App from "../src/App"
import { LanguageProvider, useTranslation } from "../src/i18n"
import {
  formatClockTime,
  formatDateTime,
  formatMeasurement,
  formatNumber,
  isTightUnit,
} from "../src/i18n/numberFormat"
import { translate, type Language } from "../src/i18n/translations"
import { translateDynamic } from "../src/i18n/dynamicTranslations"
import { setLanguage } from "../src/i18n/languageStore"

const LANGUAGES: Language[] = ["en", "hi", "bn"]

beforeEach(() => {
  localStorage.clear()
  setLanguage("en")
})
afterEach(() => {
  cleanup()
  setLanguage("en")
  localStorage.clear()
})

describe("formatNumber", () => {
  // The dashboard mixes readings with Latin acronyms (AQI, UV, PM2.5) and is
  // read at a glance, so all three languages are pinned to Latin digits —
  // Bengali would otherwise render 28 as ২৮ (see numberFormat.ts).
  it.each(LANGUAGES)("keeps readings in Latin digits in %s", (language) => {
    expect(formatNumber(28, language)).toBe("28")
    expect(formatNumber(9.2, language)).toBe("9.2")
    expect(formatNumber(90, language)).toBe("90")
  })

  it.each(LANGUAGES)("uses Indian lakh grouping in %s", (language) => {
    expect(formatNumber(123456, language)).toBe("1,23,456")
  })

  it("honours explicit Intl options", () => {
    expect(formatNumber(9.25, "hi", { maximumFractionDigits: 0 })).toBe("9")
    expect(formatNumber(3, "bn", { minimumFractionDigits: 1 })).toBe("3.0")
  })

  it("passes non-numeric input through instead of printing NaN", () => {
    // Several payload fields are optional, and a few carry a placeholder that
    // has to survive to the screen.
    expect(formatNumber("—", "hi")).toBe("—")
    expect(formatNumber("Unavailable", "bn")).toBe("Unavailable")
    expect(formatNumber(null, "en")).toBe("")
    expect(formatNumber(undefined, "en")).toBe("")
    expect(formatNumber(Number.NaN, "en")).toBe("")
    expect(formatNumber(Number.POSITIVE_INFINITY, "en")).toBe("")
  })

  it("parses a numeric string", () => {
    expect(formatNumber("9.2", "bn")).toBe("9.2")
  })

  it("falls back to English for an unknown language", () => {
    expect(formatNumber(1234, "xx" as Language)).toBe("1,234")
  })
})

describe("formatMeasurement", () => {
  it("localises the unit, not the digits", () => {
    expect(formatMeasurement(6, "en", translate("en", "unit.kmh"))).toBe("6 km/h")
    expect(formatMeasurement(6, "hi", translate("hi", "unit.kmh"))).toBe("6 किमी/घंटा")
    expect(formatMeasurement(6, "bn", translate("bn", "unit.kmh"))).toBe("6 কিমি/ঘন্টা")
  })

  it("keeps the degree and percent signs flush against the number", () => {
    expect(isTightUnit("°")).toBe(true)
    expect(isTightUnit("%")).toBe(true)
    expect(isTightUnit("किमी/घंटा")).toBe(false)
    expect(formatMeasurement(28, "hi", "°")).toBe("28°")
    expect(formatMeasurement(90, "bn", "%")).toBe("90%")
  })

  it("degrades to one half when the other is missing", () => {
    expect(formatMeasurement(9.2, "hi", "")).toBe("9.2")
    expect(formatMeasurement(null, "hi", "किमी")).toBe("किमी")
  })
})

describe("timestamps", () => {
  const instant = "2026-09-17T10:30:00Z" // 4:00 pm IST

  it.each(LANGUAGES)("renders the clock in Latin digits in %s", (language) => {
    expect(formatClockTime(instant, language)).toMatch(/\b4:00\b/)
  })

  it("localises month names while keeping the day number Latin", () => {
    expect(formatDateTime(instant, "en")).toContain("17")
    expect(formatDateTime(instant, "hi")).toContain("17")
    expect(formatDateTime(instant, "bn")).toContain("17")
    // Each language names the month in its own script.
    expect(formatDateTime(instant, "hi")).not.toBe(formatDateTime(instant, "en"))
    expect(formatDateTime(instant, "bn")).not.toBe(formatDateTime(instant, "en"))
  })

  it("returns null for an unparseable value rather than an Invalid Date", () => {
    expect(formatDateTime("not a date", "hi")).toBeNull()
    expect(formatClockTime("", "en")).toBeNull()
  })

  // The backend contract is English-only, so observation labels arrive
  // pre-formatted and are translated on the way to the screen.
  it("translates the observation labels the backend sends", () => {
    expect(translateDynamic("hi", "Updated just now")).toBe("अभी-अभी अपडेट किया गया")
    expect(translateDynamic("hi", "Updated at 4:00 pm")).toBe("4:00 pm पर अपडेट")
    expect(translateDynamic("bn", "Updated at 4:00 pm")).toBe("4:00 pm-এ আপডেট")
    expect(translateDynamic("bn", "Station update: 17-09-2026 16:00:00 IST")).toBe(
      "স্টেশন আপডেট: 17-09-2026 16:00:00 IST",
    )
  })
})

describe("translate() formats interpolated numbers", () => {
  it.each(LANGUAGES)("runs numeric slots through the number format in %s", (language) => {
    expect(translate(language, "hero.feels", { value: 28 })).toContain("28")
    expect(translate(language, "forecast.rainChip", { chance: 90 })).toContain("90")
  })

  it("groups a large interpolated number", () => {
    expect(translate("bn", "alerts.active", { count: 12345 })).toContain("12,345")
  })

  it("leaves a pre-formatted string value verbatim", () => {
    expect(translate("hi", "hero.feels", { value: "~28" })).toContain("~28")
  })
})

describe("the translator exposes n() and nu()", () => {
  function Probe() {
    const { n, nu } = useTranslation()
    return (
      <p data-testid="probe">
        {n(9.2)}|{nu(6, "unit.kmh")}|{nu(90, "unit.percent")}|{nu(28, "unit.degree")}
      </p>
    )
  }

  it.each([
    ["en", "9.2|6 km/h|90%|28°"],
    ["hi", "9.2|6 किमी/घंटा|90%|28°"],
    ["bn", "9.2|6 কিমি/ঘন্টা|90%|28°"],
  ] as const)("formats value and unit together in %s", (code, expected) => {
    setLanguage(code)
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    expect(screen.getByTestId("probe").textContent).toBe(expected)
  })
})

describe("the dashboard renders units in the active language", () => {
  // The demo dataset renders the whole dashboard without a network round trip.
  beforeEach(() => {
    vi.stubEnv("VITE_USE_DEMO_WEATHER", "true")
    localStorage.setItem(
      "mausam-profile",
      JSON.stringify({
        name: "Aditi", sensitivities: [], concerns: [], goals: ["Daily energy"],
        age: 29, activity: "Moderate",
      }),
    )
    localStorage.setItem(
      "mausam-location",
      JSON.stringify({
        latitude: 22.5726, longitude: 88.3639, locality: "Kolkata",
        region: "West Bengal", country: "India", timezone: "Asia/Kolkata",
        source: "device",
      }),
    )
  })
  afterEach(() => vi.unstubAllEnvs())

  // DEMO_WEATHER_DATA: 22 km/h wind, 89% humidity, 3.2 km visibility, 31°.
  it.each([
    ["en", "km/h", "km"],
    ["hi", "किमी/घंटा", "किमी"],
    ["bn", "কিমি/ঘন্টা", "কিমি"],
  ] as const)("labels wind and visibility in %s", async (code, kmh, km) => {
    setLanguage(code)
    const view = render(<App />)
    await waitFor(() =>
      expect(view.container.querySelector(".weather-stats-grid")).toBeInTheDocument(),
    )
    const stats = view.container.querySelector<HTMLElement>(".weather-stats-grid")!
    const values = [...stats.querySelectorAll(".weather-stat-value")].map(
      (element) => element.textContent,
    )
    expect(values).toEqual([`22${kmh}`, "89%", `3.2${km}`])
  })

  it.each(LANGUAGES)(
    "keeps the hero temperature in Latin digits in %s",
    async (code) => {
      setLanguage(code)
      const view = render(<App />)
      await waitFor(() =>
        expect(view.container.querySelector(".weather-temp-value")).toBeInTheDocument(),
      )
      expect(view.container.querySelector(".weather-temp-value")!.textContent).toBe(
        "31°",
      )
    },
  )
})
