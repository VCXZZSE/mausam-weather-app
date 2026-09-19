import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { TravelTilesGrid } from "@/components/travel/TravelTilesGrid"
import { LanguageProvider } from "@/i18n/LanguageContext"
import type { UserLocation } from "@/services/locationService"

const MOCK_LOCATION: UserLocation = {
  latitude: 22.5726,
  longitude: 88.3639,
  locality: "Kolkata",
  region: "West Bengal",
  country: "India",
  timezone: "Asia/Kolkata",
  source: "default",
}

describe("TravelTilesGrid and SpotlightLocationSearch", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("open-meteo.com")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              current: {
                temperature_2m: 29.4,
                apparent_temperature: 33.1,
                weather_code: 2,
                is_day: 1,
              },
            }),
          })
        }
        if (url.includes("nominatim.openstreetmap.org") || url.includes("/search")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                lat: "21.6266",
                lon: "87.5074",
                name: "Digha",
                display_name: "Digha, Purba Medinipur, West Bengal, India",
                address: {
                  town: "Digha",
                  state: "West Bengal",
                  country: "India",
                  postcode: "721428",
                },
              },
            ],
          })
        }
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }),
    )
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it("renders 4 empty tiles by default with add location plus buttons", () => {
    render(
      <LanguageProvider>
        <TravelTilesGrid userLocation={MOCK_LOCATION} />
      </LanguageProvider>,
    )

    const addButtons = screen.getAllByRole("button", { name: /add location/i })
    expect(addButtons).toHaveLength(4)
  })

  it("opens Spotlight search modal when an empty tile is tapped", async () => {
    render(
      <LanguageProvider>
        <TravelTilesGrid userLocation={MOCK_LOCATION} />
      </LanguageProvider>,
    )

    const addButtons = screen.getAllByRole("button", { name: /add location/i })
    fireEvent.click(addButtons[0])

    // Spotlight search modal should appear
    const searchModal = await screen.findByRole("dialog")
    expect(searchModal).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText(/search city, town, or pin code/i)
    expect(searchInput).toBeInTheDocument()

    // Suggestions should be visible
    expect(screen.getByText("Digha Beach")).toBeInTheDocument()
  })

  it("adds a location when clicking a suggestion chip and populates the tile", async () => {
    render(
      <LanguageProvider>
        <TravelTilesGrid userLocation={MOCK_LOCATION} />
      </LanguageProvider>,
    )

    // Open spotlight
    const addButtons = screen.getAllByRole("button", { name: /add location/i })
    fireEvent.click(addButtons[0])

    // Click on suggestion chip
    const dighaChip = await screen.findByText("Digha Beach")
    fireEvent.click(dighaChip)

    // Spotlight modal should close
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    // The tile should now display Digha Beach and temperature
    await waitFor(() => {
      expect(screen.getByText("Digha Beach")).toBeInTheDocument()
      expect(screen.getByText("29°")).toBeInTheDocument()
    })

    // There should now be 3 empty buttons left
    expect(screen.getAllByRole("button", { name: /add location/i })).toHaveLength(3)
  })

  it("removes a location when clicking the remove button", async () => {
    render(
      <LanguageProvider>
        <TravelTilesGrid userLocation={MOCK_LOCATION} />
      </LanguageProvider>,
    )

    // Add Digha
    fireEvent.click(screen.getAllByRole("button", { name: /add location/i })[0])
    const dighaChip = await screen.findByText("Digha Beach")
    fireEvent.click(dighaChip)

    await waitFor(() => {
      expect(screen.getByText("Digha Beach")).toBeInTheDocument()
    })

    // Click remove button
    const removeBtn = screen.getByRole("button", { name: /remove location/i })
    fireEvent.click(removeBtn)

    // Now all 4 slots should be empty again
    await waitFor(() => {
      expect(screen.queryByText("Digha Beach")).not.toBeInTheDocument()
      expect(screen.getAllByRole("button", { name: /add location/i })).toHaveLength(4)
    })
  })

  it("closes Spotlight search modal when ESC is pressed", async () => {
    render(
      <LanguageProvider>
        <TravelTilesGrid userLocation={MOCK_LOCATION} />
      </LanguageProvider>,
    )

    fireEvent.click(screen.getAllByRole("button", { name: /add location/i })[0])
    expect(await screen.findByRole("dialog")).toBeInTheDocument()

    fireEvent.keyDown(window, { key: "Escape" })

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })
})
