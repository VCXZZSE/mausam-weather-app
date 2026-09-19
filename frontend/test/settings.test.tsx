import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import {
  getSettings,
  updateSettings,
  convertTemperature,
  convertRain,
  formatClockTimeStr,
  SETTINGS_STORAGE_KEY,
  DEFAULT_SETTINGS,
} from "../src/services/settingsStore"
import { SettingsPage } from "../src/pages/SettingsPage"
import { ProfileSidebar } from "../src/components/layout/ProfileSidebar"
import { LanguageProvider } from "../src/i18n/LanguageContext"
import type { Profile } from "../src/App"
import type { UserLocation } from "../src/services/locationService"

const MOCK_PROFILE: Profile = {
  name: "Aarav Sharma",
  age: 28,
  activity: "Moderate",
  gender: "Male",
  goals: ["Cardio fitness"],
  sensitivities: ["Dust"],
  concerns: [],
}

const MOCK_LOCATION: UserLocation = {
  latitude: 28.6139,
  longitude: 77.209,
  locality: "New Delhi",
  region: "Delhi",
  country: "India",
  timezone: "Asia/Kolkata",
  source: "manual",
}

describe("Settings Store & Unit Conversions", () => {
  beforeEach(() => {
    localStorage.clear()
    updateSettings(DEFAULT_SETTINGS)
  })

  it("has correct default settings", () => {
    const settings = getSettings()
    expect(settings.temperatureUnit).toBe("C")
    expect(settings.rainUnit).toBe("mm")
    expect(settings.timeFormat).toBe("12h")
  })

  it("converts temperature accurately between C and F", () => {
    expect(convertTemperature(0, "C")).toBe(0)
    expect(convertTemperature(0, "F")).toBe(32)
    expect(convertTemperature(25, "F")).toBe(77)
    expect(convertTemperature(100, "F")).toBe(212)
    expect(convertTemperature(28, "C")).toBe(28)
    expect(convertTemperature(null, "C")).toBe(0)
  })

  it("converts rain accurately between mm and inches", () => {
    const mmResult = convertRain(10, "mm")
    expect(mmResult.value).toBe(10)
    expect(mmResult.unit).toBe("mm")

    const inResult = convertRain(25.4, "in")
    expect(inResult.value).toBeCloseTo(1, 1)
    expect(inResult.unit).toBe("in")
  })

  it("formats 12h clock strings to 24h format when selected", () => {
    expect(formatClockTimeStr("5:21 AM", "12h")).toBe("5:21 AM")
    expect(formatClockTimeStr("5:21 AM", "24h")).toBe("05:21")
    expect(formatClockTimeStr("6:48 PM", "24h")).toBe("18:48")
    expect(formatClockTimeStr("12:00 AM", "24h")).toBe("00:00")
    expect(formatClockTimeStr("12:30 PM", "24h")).toBe("12:30")
    expect(formatClockTimeStr("11 AM", "24h")).toBe("11:00")
    expect(formatClockTimeStr("2 PM", "24h")).toBe("14:00")
  })
})

describe("SettingsPage Component", () => {
  beforeEach(() => {
    localStorage.clear()
    updateSettings(DEFAULT_SETTINGS)
  })

  it("renders settings options and allows toggling units", () => {
    const onBack = vi.fn()
    render(
      <LanguageProvider>
        <SettingsPage onBack={onBack} />
      </LanguageProvider>
    )

    // Check header and sections
    expect(screen.getAllByText(/Settings/i).length).toBeGreaterThan(0)
    expect(screen.getByRole("radio", { name: /Celsius/i })).toBeDefined()
    expect(screen.getByRole("radio", { name: /Fahrenheit/i })).toBeDefined()
    expect(screen.getByRole("radio", { name: /Millimetres/i })).toBeDefined()
    expect(screen.getByRole("radio", { name: /Inches/i })).toBeDefined()
    expect(screen.getByRole("radio", { name: /24 Hours/i })).toBeDefined()

    // Toggle temperature to Fahrenheit
    fireEvent.click(screen.getByRole("radio", { name: /Fahrenheit/i }))
    expect(getSettings().temperatureUnit).toBe("F")

    // Toggle rain to inches
    fireEvent.click(screen.getByRole("radio", { name: /Inches/i }))
    expect(getSettings().rainUnit).toBe("in")

    // Toggle time format to 24 hours
    fireEvent.click(screen.getByRole("radio", { name: /24 Hours/i }))
    expect(getSettings().timeFormat).toBe("24h")
  })
})

describe("ProfileSidebar Settings Integration", () => {
  it("renders Settings button after FAQs and handles click", () => {
    const onSettings = vi.fn()
    render(
      <LanguageProvider>
        <ProfileSidebar
          open={true}
          profile={MOCK_PROFILE}
          location={MOCK_LOCATION}
          theme="light"
          onClose={vi.fn()}
          onChangeLocation={vi.fn()}
          onLogout={vi.fn()}
          onBriefing={vi.fn()}
          onPrivacy={vi.fn()}
          onFAQ={vi.fn()}
          onSettings={onSettings}
        />
      </LanguageProvider>
    )

    const settingsBtn = screen.getByRole("button", { name: /Settings Units, temperature/i })
    expect(settingsBtn).toBeDefined()
    fireEvent.click(settingsBtn)
    expect(onSettings).toHaveBeenCalledTimes(1)
  })
})
