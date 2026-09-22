import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react"
import App from "../src/App"
import { setLanguage } from "../src/i18n/languageStore"
import { findUntranslatedText } from "../src/i18n/debug"
import { HOME_PRESETS } from "../src/services/homePresets"

// Renders the real app and asserts that no English prose survives into Hindi or
// Bengali. The scanner is the same one the in-app debug overlay uses, so this
// test and the overlay can never disagree about what counts as a miss.
//
// Elements that render geocoder output or the user's own name carry
// data-i18n-ignore: there is nothing to translate a place name to, and the app
// shows whatever the provider returned.

const PROFILE = {
  name: "Aditi",
  sensitivities: ["Heat"],
  concerns: ["Allergies"],
  goals: ["Daily energy"],
  age: 29,
  activity: "Moderate",
  persona: "health",
}
const LOCATION = {
  latitude: 22.5726,
  longitude: 88.3639,
  locality: "Kolkata",
  region: "West Bengal",
  country: "India",
  timezone: "Asia/Kolkata",
  source: "device" as const,
}

const LANGUAGES = ["hi", "bn"] as const

beforeEach(() => {
  localStorage.clear()
  vi.stubEnv("VITE_USE_DEMO_WEATHER", "true")
  localStorage.setItem("mausam-profile", JSON.stringify(PROFILE))
  localStorage.setItem("mausam-location", JSON.stringify(LOCATION))
})
afterEach(() => {
  cleanup()
  setLanguage("en")
  vi.unstubAllEnvs()
  localStorage.clear()
})

async function renderDashboard(
  code: (typeof LANGUAGES)[number],
  persona = PROFILE.persona,
) {
  if (persona !== PROFILE.persona)
    localStorage.setItem(
      "mausam-profile",
      JSON.stringify({ ...PROFILE, persona }),
    )
  setLanguage(code)
  const view = render(<App />)
  await waitFor(() =>
    expect(view.container.querySelector(".metric-grid")).toBeInTheDocument(),
  )
  return view
}

/** Scans the app shell and every portalled surface (the sidebar dialog). */
function scan(): string[] {
  return findUntranslatedText(document.body).map((miss) => miss.text)
}

describe("translation audit", () => {
  it.each(LANGUAGES)("leaves no English prose on the homepage in %s", async (code) => {
    await renderDashboard(code)
    expect(scan()).toEqual([])
  })

  // Each persona lays the homepage out differently, and several of its tiles
  // (soil, sea, pollen, sun & moon, wind, visibility, heat, event) appear on no
  // other screen - so scanning one persona cannot stand in for the rest.
  const PERSONAS = Object.keys(HOME_PRESETS) as Array<keyof typeof HOME_PRESETS>
  const MATRIX = LANGUAGES.flatMap(code => PERSONAS.map(persona => [code, persona] as const))

  it.each(MATRIX)("leaves no English prose on the %s homepage for the %s persona", async (code, persona) => {
    await renderDashboard(code, persona)
    expect({ persona, misses: scan() }).toEqual({ persona, misses: [] })
  })

  it.each(LANGUAGES)("leaves no English prose on the other tabs in %s", async (code) => {
    const view = await renderDashboard(code)
    const nav = view.container.querySelector("nav")!
    const tabs = within(nav).getAllByRole("button")
    for (const [index, tab] of tabs.entries()) {
      if (index === 0) continue // home, covered above
      fireEvent.click(tab)
      expect({ tab: index, misses: scan() }).toEqual({ tab: index, misses: [] })
    }
  })

  it.each(LANGUAGES)("leaves no English prose in the sidebar in %s", async (code) => {
    const view = await renderDashboard(code)
    fireEvent.click(
      view.container.querySelector<HTMLButtonElement>(".mausam-menu-trigger")!,
    )
    const dialog = document.querySelector("dialog")!
    // Expand the collapsed preferences panel so its chips are scanned too.
    fireEvent.click(dialog.querySelector("summary")!)
    expect(scan()).toEqual([])
  })

  it.each(LANGUAGES)("leaves no English prose in the briefing overlay in %s", async (code) => {
    const view = await renderDashboard(code)
    fireEvent.click(
      view.container.querySelector<HTMLButtonElement>(".personal-insight")!,
    )
    await waitFor(() =>
      expect(
        view.container.querySelector(".personalized-page"),
      ).toBeInTheDocument(),
    )
    // Open the "why these recommendations?" disclosure.
    fireEvent.click(
      view.container.querySelector<HTMLButtonElement>(
        ".personalized-why button",
      )!,
    )
    expect(scan()).toEqual([])
  })
})
