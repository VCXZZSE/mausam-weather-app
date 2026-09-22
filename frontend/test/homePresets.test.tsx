import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import App from "../src/App"
import { USER_PERSONAS } from "../src/App"
import {
  DEFAULT_HOME_PRESET,
  HOME_PRESETS,
  HOME_PRESET_STORAGE_KEY,
  HOME_PRESET_VERSION,
  clearHomePreset,
  getHomePreset,
  loadHomePreset,
  resolveHomePreset,
  saveHomePreset,
  type MetricId,
  type UserPersonaId,
} from "../src/services/homePresets"

// The homepage is assembled from a per-persona preset (services/homePresets.ts).
// Two things have to hold, and neither is visible from the registry alone:
//
//   1. Every persona gets a coherent, non-contradictory layout, and the
//      readings a preset declares suppressed really are absent.
//   2. The layout actually reaches the screen for the persona in the saved
//      profile, and survives a reload.

const LOCATION = {
  latitude: 22.5726,
  longitude: 88.3639,
  locality: "Kolkata",
  region: "West Bengal",
  country: "India",
  timezone: "Asia/Kolkata",
  source: "device" as const,
}

function seedProfile(persona: UserPersonaId) {
  localStorage.setItem(
    "mausam-profile",
    JSON.stringify({
      name: "Aditi",
      sensitivities: ["Heat"],
      concerns: ["Allergies"],
      goals: ["Daily energy"],
      age: 29,
      activity: "Moderate",
      persona,
    }),
  )
  localStorage.setItem("mausam-location", JSON.stringify(LOCATION))
}

beforeEach(() => {
  localStorage.clear()
  vi.stubEnv("VITE_USE_DEMO_WEATHER", "true")
})
afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  localStorage.clear()
})

const PERSONA_IDS = Object.keys(HOME_PRESETS) as UserPersonaId[]

describe("home preset registry", () => {
  it("covers every persona the onboarding wheel offers", () => {
    expect(PERSONA_IDS.sort()).toEqual(USER_PERSONAS.map((p) => p.id).sort())
  })

  it.each(PERSONA_IDS)("gives %s a self-consistent layout", (persona) => {
    const preset = HOME_PRESETS[persona]
    expect(preset.persona).toBe(persona)
    expect(preset.heroStats).toHaveLength(3)
    expect(new Set(preset.heroStats).size).toBe(3)
    expect(preset.metrics.length).toBeGreaterThan(0)
    expect(preset.glance.length).toBeGreaterThan(0)

    // No reading is both shown and declared suppressed - that would make the
    // suppression list a lie rather than a record of a decision.
    const shown = preset.metrics.map((tile) => tile.id)
    expect(shown.filter((id) => preset.suppressed.includes(id))).toEqual([])

    // No duplicate tiles, and no duplicate chips.
    expect(new Set(shown).size).toBe(shown.length)
    expect(new Set(preset.glance).size).toBe(preset.glance.length)

    // At most one full-width lead tile, or the grid stops reading as a grid.
    expect(preset.metrics.filter((tile) => tile.wide).length).toBeLessThanOrEqual(1)

    // The metric grid has to be somewhere on the page it belongs to.
    expect(preset.sections).toContain("metrics")
    expect(new Set(preset.sections).size).toBe(preset.sections.length)

    // No persona's homepage carries a warning surface. Warnings live on the
    // Alerts tab and nowhere else, so there is one place to look for one.
    expect(preset.sections).not.toContain("alerts")
    expect(preset.sections).not.toContain("advisories")
  })

  it("gives a sector bulletin only to the two personas who work in one", () => {
    const withSpecialties = PERSONA_IDS.filter(
      (id) => HOME_PRESETS[id].advisorySpecialties.length > 0,
    )
    expect(withSpecialties.sort()).toEqual(["beach", "garden"])
    expect(HOME_PRESETS.garden.advisorySpecialties).toEqual(["farming"])
    expect(HOME_PRESETS.beach.advisorySpecialties).toEqual(["fishing"])
  })

  // The two cases the product brief calls out by name.
  it("keeps air quality and transport off the agriculture homepage", () => {
    const garden = HOME_PRESETS.garden
    const shown = garden.metrics.map((tile) => tile.id)
    expect(shown).not.toContain("aqi")
    expect(shown).not.toContain("commute")
    expect(garden.glance).not.toContain("aqi")
    expect(garden.glance).not.toContain("commute")
    expect(garden.suppressed).toEqual(
      expect.arrayContaining<MetricId>(["aqi", "commute"]),
    )
    // What replaces them: soil and rain. The government's agromet bulletins
    // are this persona's too, but they are on the Alerts tab with every other
    // warning, not on the dashboard.
    expect(shown).toContain("soil")
    expect(shown).toContain("rainfall")
    expect(garden.advisorySpecialties).toContain("farming")
  })

  it("gives commuters transport, air quality and sun together", () => {
    const shown = HOME_PRESETS.commute.metrics.map((tile) => tile.id)
    expect(shown).toEqual(expect.arrayContaining<MetricId>(["commute", "aqi", "uv"]))
    expect(HOME_PRESETS.commute.heroStats[0]).toBe("visibility")
  })

  it("gives the coastal persona the marine bulletin and the sea tile", () => {
    expect(HOME_PRESETS.beach.advisorySpecialties).toContain("fishing")
    expect(HOME_PRESETS.beach.metrics.map((t) => t.id)).toContain("sea")
  })
})

describe("home preset storage", () => {
  it("falls back to the pre-persona layout for a profile without one", () => {
    expect(getHomePreset(undefined)).toBe(DEFAULT_HOME_PRESET)
    expect(getHomePreset("not-a-persona")).toBe(DEFAULT_HOME_PRESET)
  })

  it("saves the resolved layout and reads it back", () => {
    expect(loadHomePreset()).toBeNull()
    expect(saveHomePreset("garden")).toBe(HOME_PRESETS.garden)
    expect(loadHomePreset()).toBe(HOME_PRESETS.garden)

    const stored = JSON.parse(localStorage.getItem(HOME_PRESET_STORAGE_KEY)!)
    expect(stored.persona).toBe("garden")
    expect(stored.version).toBe(HOME_PRESET_VERSION)
  })

  it("rebuilds from the registry when the stored record is stale or broken", () => {
    saveHomePreset("garden")
    const stored = JSON.parse(localStorage.getItem(HOME_PRESET_STORAGE_KEY)!)

    localStorage.setItem(
      HOME_PRESET_STORAGE_KEY,
      JSON.stringify({ ...stored, version: HOME_PRESET_VERSION - 1 }),
    )
    expect(loadHomePreset()).toBeNull()

    localStorage.setItem(
      HOME_PRESET_STORAGE_KEY,
      JSON.stringify({ ...stored, persona: "astronaut" }),
    )
    expect(loadHomePreset()).toBeNull()

    localStorage.setItem(HOME_PRESET_STORAGE_KEY, "{not json")
    expect(loadHomePreset()).toBeNull()
  })

  it("serves a preset edited in source over the copy that was saved", () => {
    // Storage records *which* preset, not its contents, so changing a layout in
    // the registry takes effect without a version bump.
    saveHomePreset("garden")
    localStorage.setItem(
      HOME_PRESET_STORAGE_KEY,
      JSON.stringify({
        version: HOME_PRESET_VERSION,
        persona: "garden",
        savedAt: new Date().toISOString(),
        preset: { ...HOME_PRESETS.garden, metrics: [{ id: "aqi" }] },
      }),
    )
    expect(loadHomePreset()).toBe(HOME_PRESETS.garden)
    expect(loadHomePreset()!.metrics.map((t) => t.id)).not.toEqual(["aqi"])
  })

  it("rewrites the saved layout when the persona changes", () => {
    resolveHomePreset("garden")
    expect(loadHomePreset()).toBe(HOME_PRESETS.garden)
    resolveHomePreset("commute")
    expect(loadHomePreset()).toBe(HOME_PRESETS.commute)
    clearHomePreset()
    expect(loadHomePreset()).toBeNull()
  })
})

describe("the homepage a persona actually gets", () => {
  async function renderHome(persona: UserPersonaId) {
    seedProfile(persona)
    const view = render(<App />)
    await waitFor(() =>
      expect(view.container.querySelector(".metric-grid")).toBeInTheDocument(),
    )
    return view
  }

  /** The tile class names the grid gives each metric, for assertions below. */
  const TILE_CLASS: Record<MetricId, string> = {
    aqi: "aqi-tile",
    uv: "uv-tile",
    run: "run-tile",
    rainfall: "rainfall-tile",
    commute: "commute-tile",
    soil: "soil-tile",
    sea: "sea-tile",
    pollen: "pollen-tile",
    comfort: "comfort-tile",
    sunMoon: "sunmoon-tile",
    wind: "wind-tile",
    visibility: "visibility-tile",
    heat: "heat-tile",
    event: "event-tile",
  }

  it.each(PERSONA_IDS)(
    "renders exactly the %s preset's tiles, and none it suppresses",
    async (persona) => {
      const view = await renderHome(persona)
      const grid = view.container.querySelector(".metric-grid")!
      const preset = HOME_PRESETS[persona]

      for (const tile of preset.metrics)
        expect(grid.querySelector(`.${TILE_CLASS[tile.id]}`)).toBeInTheDocument()

      for (const id of preset.suppressed)
        expect(
          view.container.querySelector(`.${TILE_CLASS[id]}`),
        ).not.toBeInTheDocument()
    },
  )

  it.each(PERSONA_IDS)("names the %s persona its layout came from", async (persona) => {
    const view = await renderHome(persona)
    const strap = view.container.querySelector(".preset-strap")!
    expect(strap).toBeInTheDocument()
    expect(strap.textContent).toContain(
      USER_PERSONAS.find((p) => p.id === persona)!.shortTitle,
    )
  })

  it("puts the farmer's soil tile first and shows no AQI reading anywhere", async () => {
    const view = await renderHome("garden")
    const grid = view.container.querySelector(".metric-grid")!
    expect(grid.firstElementChild).toHaveClass("soil-tile")
    // Not merely off the grid - the number itself is nowhere on the page.
    expect(view.container.querySelector(".aqi-tile")).not.toBeInTheDocument()
    expect(view.container.querySelector(".commute-tile")).not.toBeInTheDocument()
    expect(screen.queryByText(/AQI/)).not.toBeInTheDocument()
  })

  it("leads the commuter with transport and keeps the soil tile away", async () => {
    const view = await renderHome("commute")
    const grid = view.container.querySelector(".metric-grid")!
    expect(grid.firstElementChild).toHaveClass("commute-tile")
    expect(grid.querySelector(".aqi-tile")).toBeInTheDocument()
    expect(grid.querySelector(".uv-tile")).toBeInTheDocument()
    expect(view.container.querySelector(".soil-tile")).not.toBeInTheDocument()
  })

  it("puts each persona's own readings under the hero temperature", async () => {
    const commuter = await renderHome("commute")
    const strip = commuter.container.querySelector(".weather-stats-grid")!
    // The demo payload reports 3.2 km visibility; the commuter preset asks for
    // it first, where the old fixed layout had wind.
    expect(within(strip as HTMLElement).getAllByText("3.2").length).toBe(1)
    expect(strip.querySelectorAll(".weather-stat")).toHaveLength(3)
  })

  it("leaves a profile saved before the persona question on the old layout", async () => {
    // The upgrade path: no persona in storage must not mean a blank or
    // rearranged homepage, and there is no persona to name in a strap.
    localStorage.setItem(
      "mausam-profile",
      JSON.stringify({
        name: "Aditi",
        sensitivities: ["Heat"],
        concerns: [],
        goals: [],
        age: 29,
        activity: "Moderate",
      }),
    )
    localStorage.setItem("mausam-location", JSON.stringify(LOCATION))
    const view = render(<App />)
    await waitFor(() =>
      expect(view.container.querySelector(".metric-grid")).toBeInTheDocument(),
    )
    const grid = view.container.querySelector(".metric-grid")!
    for (const tile of DEFAULT_HOME_PRESET.metrics)
      expect(grid.querySelector(`.${TILE_CLASS[tile.id]}`)).toBeInTheDocument()
    expect(view.container.querySelector(".preset-strap")).not.toBeInTheDocument()
  })

  it.each(PERSONA_IDS)(
    "shows no warning on the %s dashboard — they belong to the Alerts panel",
    async (persona) => {
      const view = await renderHome(persona)
      // Neither the severe-weather alerts nor the government bulletins.
      expect(
        view.container.querySelector(".official-advisories"),
      ).not.toBeInTheDocument()
      expect(view.container.querySelector(".persona-alerts")).not.toBeInTheDocument()
      // The demo payload's red IMD warning is not on this screen either.
      expect(screen.queryByText(/Heavy Rainfall Warning/i)).not.toBeInTheDocument()
    },
  )

  /** Opens the dedicated alert panel from the bottom navigation. */
  async function openAlertsPanel(persona: UserPersonaId) {
    const view = await renderHome(persona)
    const nav = view.container.querySelector("nav")!
    const tabs = within(nav).getAllByRole("button")
    fireEvent.click(tabs[tabs.length - 1])
    await waitFor(() =>
      expect(view.container.querySelector(".alerts-screen")).toBeInTheDocument(),
    )
    return view
  }

  it("carries every warning in the alert panel", async () => {
    const view = await openAlertsPanel("commute")
    // The severe-weather alerts the dashboard no longer shows...
    expect(await screen.findByText(/Heavy Rainfall Warning/i)).toBeInTheDocument()
    // ...and the government bulletins, in the same place.
    expect(view.container.querySelector(".official-advisories")).toBeInTheDocument()
  })

  it("gives the farmer the agromet bulletin and no marine one", async () => {
    const view = await openAlertsPanel("garden")
    const advisories = view.container.querySelector(".official-advisories")!
    expect(within(advisories as HTMLElement).getByText(/Farming/i)).toBeInTheDocument()
    expect(within(advisories as HTMLElement).queryByText(/Fishing/i)).not.toBeInTheDocument()
  })

  it("gives the coastal persona the marine bulletin and no agromet one", async () => {
    const view = await openAlertsPanel("beach")
    const advisories = view.container.querySelector(".official-advisories")!
    expect(within(advisories as HTMLElement).getByText(/Fishing/i)).toBeInTheDocument()
    expect(within(advisories as HTMLElement).queryByText(/Farming/i)).not.toBeInTheDocument()
  })

  it.each(["health", "fitness", "travel", "family", "commute", "event"] as UserPersonaId[])(
    "shows %s neither sector bulletin, but still the general ones",
    async (persona) => {
      const view = await openAlertsPanel(persona)
      const advisories = view.container.querySelector(".official-advisories")!
      expect(advisories.querySelector(".official-specialties")).not.toBeInTheDocument()
      // The general block — where a cyclone or rainfall warning lands — stays.
      expect(advisories.querySelector(".official-general")).toBeInTheDocument()
    },
  )

  it("keeps the saved layout across a reload", async () => {
    const view = await renderHome("beach")
    expect(view.container.querySelector(".sea-tile")).toBeInTheDocument()
    expect(loadHomePreset()).toBe(HOME_PRESETS.beach)

    cleanup()
    const reopened = render(<App />)
    await waitFor(() =>
      expect(reopened.container.querySelector(".sea-tile")).toBeInTheDocument(),
    )
  })
})
