import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import App from "../src/App"

// Matches the unexported PROFILE_STORAGE_KEY constant in src/App.tsx.
const PROFILE_STORAGE_KEY = "mausam-profile"
const LOCATION_STORAGE_KEY = "mausam-location"

const VALID_PROFILE = {
  name: "Test User",
  sensitivities: [],
  concerns: [],
  goals: ["Daily energy"],
  age: 30,
  height: 170,
  weight: 65,
  activity: "Moderate",
}

function seedProfile() {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(VALID_PROFILE))
}

function weatherFixture(overrides: Record<string, unknown> = {}) {
  return {
    updatedAt: "Updated at 3:45 pm",
    observedAt: "2026-09-05T10:15:00.000Z",
    location: {
      latitude: 22.5726,
      longitude: 88.3639,
      locality: "Kolkata",
      region: "West Bengal",
      country: "India",
      timezone: "Asia/Kolkata",
      source: "device",
    },
    current: {
      city: "Kolkata",
      region: "West Bengal",
      temperature: 29,
      feelsLike: 30,
      condition: "Clear sky",
      conditionCode: "clear",
      heroVariant: "sunny",
      high: 32,
      low: 24,
      humidity: 60,
      windSpeed: 10,
      windDirection: "SW",
      windGust: 15,
      visibility: 8,
      pressure: 1010,
      dewPoint: 18,
      heatIndex: 30,
      hydrationAdvice: "Stay hydrated.",
      isDay: true,
    },
    hourly: [
      {
        time: "Now",
        temperature: 29,
        condition: "Clear sky",
        conditionCode: "clear",
        rainChance: 5,
      },
    ],
    daily: [
      {
        day: "Today",
        high: 32,
        low: 24,
        condition: "Clear sky",
        conditionCode: "clear",
        rainChance: 5,
      },
    ],
    overview: [
      { icon: "♥", label: "Health", value: "UV 3", tone: "focus-health" },
    ],
    uv: {
      index: 3,
      scaleMax: 11,
      scaleLabels: ["Low"],
      label: "Low",
      recommendation: "None needed",
      peakHours: "Around noon",
      burnTime: "~60 min",
      advice: "None needed",
    },
    astronomy: {
      sunrise: "5:20 am",
      sunset: "5:50 pm",
      solarNoon: "11:35 am",
      moonPhase: "Waning Crescent",
      goldenHour: "5:20 pm",
      moonrise: "—",
    },
    comfort: {
      index: 80,
      label: "Comfortable",
      icon: "🙂",
      advice: "Nice out.",
      factors: [],
    },
    running: {
      badge: "FITNESS",
      start: "6 am",
      end: "8 am",
      summary: "Good conditions 6 am–8 am",
    },
    rainfall: {
      chance: 5,
      today: 0,
      unit: "mm",
      periodLabel: "Today",
      monthLabel: "September",
    },
    commute: { status: "NORMAL", location: "Kolkata", items: [] },
    swimming: {
      badge: "FAVORABLE",
      venue: "Kolkata Swimming Pool",
      distance: "12km",
      depth: 2.1,
      depthUnit: "m",
      waterTemperature: 26,
      peakTime: "11 am",
      advice: "Good conditions.",
    },
    garden: {
      badge: "GOOD",
      title: "Season note",
      soil: "Moist",
      note: "Note",
    },
    pollen: { overall: "Low", icon: "🌿", advice: "Low levels.", items: [] },
    alerts: [],
    locations: [],
    packing: { title: "For Kolkata", items: [] },
    event: {
      sectionLabel: "Event Planner",
      icon: "🌤️",
      title: "Weekend Outdoor Weather Outlook",
      dateRange: "6 Sep–7 Sep",
      daysAway: 1,
      expectedSeason: "Monsoon",
      expectedTemperature: 30,
      rainLabel: "Low Rain",
      rainChance: 10,
      advice: "Favorable.",
    },
    ...overrides,
  }
}

describe("App — location-first state machine", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv("VITE_WEATHER_API_URL", "http://localhost:3000/api/weather")
    vi.stubEnv(
      "VITE_PERSONALIZED_BRIEFING_API_URL",
      "http://localhost:3000/api/personalized-briefing",
    )
    vi.stubEnv(
      "VITE_LOCATION_REVERSE_API_URL",
      "http://localhost:3000/api/location/reverse",
    )
    vi.stubEnv(
      "VITE_LOCATION_SEARCH_API_URL",
      "http://localhost:3000/api/location/search",
    )

    fetchMock = vi.fn(async (input: string | URL) => {
      const url = input.toString()
      if (url.includes("/api/location/reverse")) {
        return {
          ok: true,
          json: async () => ({
            locality: "Kolkata",
            region: "West Bengal",
            country: "India",
          }),
        }
      }
      if (url.includes("/api/location/search")) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                name: "Mumbai",
                region: "Maharashtra",
                country: "India",
                postalCode: "400001",
                latitude: 19.07,
                longitude: 72.88,
                timezone: "Asia/Kolkata",
              },
              {
                name: "London",
                region: "England",
                country: "United Kingdom",
                latitude: 51.5,
                longitude: -0.1,
                timezone: "Europe/London",
              },
            ],
          }),
        }
      }
      if (url.includes("/api/weather")) {
        const parsed = new URL(url)
        const lat = parsed.searchParams.get("latitude")
        return {
          ok: true,
          json: async () =>
            weatherFixture({
              current: {
                ...weatherFixture().current,
                temperature: lat === "19.07" ? 33 : 29,
              },
            }),
        }
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    // jsdom does not implement geolocation by default.
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: vi.fn() },
    })
  })

  afterEach(() => {
    cleanup()
    window.history.replaceState({}, "", "/")
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it("asks only for a name on the first profile step and does not preselect Kolkata", async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      await screen.findByRole("button", { name: /start your profile/i }),
    )

    expect(
      await screen.findByLabelText(/your name required/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/home location/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Kolkata$/i)).not.toBeInTheDocument()
  })

  it("supports a one-shot development onboarding preview URL", async () => {
    seedProfile()
    localStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify({
        latitude: 22.5726,
        longitude: 88.3639,
        locality: "Kolkata",
        region: "West Bengal",
        country: "India",
        timezone: "Asia/Kolkata",
        source: "device",
      }),
    )
    window.history.replaceState({}, "", "/?preview=onboarding")

    render(<App />)

    expect(
      await screen.findByRole("button", { name: /start your profile/i }),
    ).toBeInTheDocument()
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(LOCATION_STORAGE_KEY)).toBeNull()
    expect(window.location.search).toBe("")
  })

  it("removes the legacy hardcoded Kolkata field from an existing saved profile", async () => {
    localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify({ ...VALID_PROFILE, location: "Kolkata" }),
    )
    render(<App />)

    await waitFor(() => {
      expect(
        JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? "{}"),
      ).not.toHaveProperty("location")
    })
  })

  it("makes NO weather request before a location is resolved (initial load)", async () => {
    seedProfile()
    render(<App />)

    // The location screen must be showing, not the dashboard.
    expect(await screen.findByText(/where are/i)).toBeInTheDocument()

    const weatherCalls = fetchMock.mock.calls.filter((call) =>
      call[0].toString().includes("/api/weather"),
    )
    expect(weatherCalls).toHaveLength(0)
  })

  it("permission granted: uses the device coordinates and fetches weather only after they are resolved", async () => {
    seedProfile()
    const geolocation = navigator.geolocation as unknown as {
      getCurrentPosition: ReturnType<typeof vi.fn>
    }
    geolocation.getCurrentPosition.mockImplementation(
      (success: PositionCallback) => {
        success({
          coords: { latitude: 22.5726, longitude: 88.3639, accuracy: 20 },
        } as GeolocationPosition)
      },
    )

    const user = userEvent.setup()
    render(<App />)

    await user.click(
      await screen.findByRole("button", { name: /use my current area/i }),
    )

    await waitFor(() => {
      const weatherCalls = fetchMock.mock.calls.filter((call) =>
        call[0].toString().includes("/api/weather"),
      )
      expect(weatherCalls.length).toBeGreaterThan(0)
    })

    const [firstWeatherCall] = fetchMock.mock.calls.filter((call) =>
      call[0].toString().includes("/api/weather"),
    )
    const calledUrl = new URL(firstWeatherCall[0].toString())
    // src/location.ts rounds device coordinates to ~3 decimal places.
    expect(calledUrl.searchParams.get("latitude")).toBe("22.573")
    expect(calledUrl.searchParams.get("longitude")).toBe("88.364")
  })

  it("tries a fast area-level fix first, then falls back to precise GPS", async () => {
    seedProfile()
    const geolocation = navigator.geolocation as unknown as {
      getCurrentPosition: ReturnType<typeof vi.fn>
    }
    geolocation.getCurrentPosition
      .mockImplementationOnce(
        (
          _success: PositionCallback,
          error: PositionErrorCallback,
          options: PositionOptions,
        ) => {
          expect(options.enableHighAccuracy).toBe(false)
          error({
            code: 2,
            message: "Network-assisted provider unavailable",
          } as GeolocationPositionError)
        },
      )
      .mockImplementationOnce(
        (
          success: PositionCallback,
          _error: PositionErrorCallback,
          options: PositionOptions,
        ) => {
          expect(options.enableHighAccuracy).toBe(true)
          success({
            coords: { latitude: 22.6014, longitude: 88.3891, accuracy: 900 },
          } as GeolocationPosition)
        },
      )

    const user = userEvent.setup()
    render(<App />)
    await user.click(
      await screen.findByRole("button", { name: /use my current area/i }),
    )

    await waitFor(() =>
      expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(2),
    )
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter((call) =>
          call[0].toString().includes("/api/weather"),
        ).length,
      ).toBeGreaterThan(0)
    })
    const weatherCalls = fetchMock.mock.calls.filter((call) =>
      call[0].toString().includes("/api/weather"),
    )
    const calledUrl = new URL(weatherCalls[0][0].toString())
    expect(calledUrl.searchParams.get("latitude")).toBe("22.601")
    expect(calledUrl.searchParams.get("longitude")).toBe("88.389")
  })

  it("permission denied: does not fall back to a default Kolkata request; manual selection is required first", async () => {
    seedProfile()
    const geolocation = navigator.geolocation as unknown as {
      getCurrentPosition: ReturnType<typeof vi.fn>
    }
    geolocation.getCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        // Embedded browsers may expose only the standard numeric code and
        // message, without constants attached to the error instance.
        error({
          code: 1,
          message: "Permission denied",
        } as GeolocationPositionError)
      },
    )

    const user = userEvent.setup()
    render(<App />)

    await user.click(
      await screen.findByRole("button", { name: /use my current area/i }),
    )

    // No weather request must have occurred from the denied attempt alone.
    // The component auto-reveals manual search on a permission error.
    await waitFor(() =>
      expect(
        screen.getByText(/location access is blocked/i),
      ).toBeInTheDocument(),
    )
    let weatherCalls = fetchMock.mock.calls.filter((call) =>
      call[0].toString().includes("/api/weather"),
    )
    expect(weatherCalls).toHaveLength(0)

    // Manual selection now proceeds.
    await user.type(
      await screen.findByPlaceholderText(/kadamtala or 711101/i),
      "Mumbai",
    )
    await user.click(screen.getByRole("button", { name: /^search$/i }))
    await user.click(
      await screen.findByRole("button", { name: /Mumbai · 400001/i }),
    )

    // After selecting location, the Ready slider appears
    await waitFor(() =>
      expect(screen.getByText(/Your world/i)).toBeInTheDocument(),
    )
    expect(screen.getByText(/SLIDE TO DIVE IN/i)).toBeInTheDocument()

    // Complete the slider to enter the app
    const slider = screen.getByLabelText(/Slide to enter Mausam/i)
    await user.click(slider)
    // Simulate sliding to 100%
    slider.dispatchEvent(new Event("change", { bubbles: true }))
    Object.defineProperty(slider, "value", { value: "100", writable: true })
    slider.dispatchEvent(new Event("input", { bubbles: true }))
    slider.dispatchEvent(new Event("change", { bubbles: true }))

    await waitFor(() => {
      weatherCalls = fetchMock.mock.calls.filter((call) =>
        call[0].toString().includes("/api/weather"),
      )
      expect(weatherCalls.length).toBeGreaterThan(0)
    })
    const calledUrl = new URL(weatherCalls[0][0].toString())
    expect(calledUrl.searchParams.get("latitude")).toBe("19.07")
    expect(
      await screen.findByText("Mumbai · 400001, Maharashtra"),
    ).toBeInTheDocument()
  })

  it("demo location: only requests weather after the explicit demo button is pressed", async () => {
    seedProfile()
    const user = userEvent.setup()
    render(<App />)

    expect(
      fetchMock.mock.calls.filter((c) =>
        c[0].toString().includes("/api/weather"),
      ),
    ).toHaveLength(0)

    await user.click(
      await screen.findByRole("button", {
        name: /continue with kolkata demo location/i,
      }),
    )

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter((c) =>
          c[0].toString().includes("/api/weather"),
        ).length,
      ).toBeGreaterThan(0)
    })
  })

  it("manual location search waits for submit and accepts an Indian six-digit PIN", async () => {
    seedProfile()
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      await screen.findByRole("button", { name: /search manually instead/i }),
    )
    const input = await screen.findByPlaceholderText(/kadamtala or 711101/i)
    await user.type(input, "711101")
    expect(
      fetchMock.mock.calls.filter((call) =>
        call[0].toString().includes("/api/location/search"),
      ),
    ).toHaveLength(0)

    await user.click(screen.getByRole("button", { name: /^search$/i }))
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter((call) =>
          call[0].toString().includes("/api/location/search"),
        ),
      ).toHaveLength(1)
    })
    expect(await screen.findByText(/Mumbai · 400001/i)).toBeInTheDocument()
    expect(screen.queryByText(/London/i)).not.toBeInTheDocument()
  })

  it("manual location search rejects an incomplete numeric PIN locally", async () => {
    seedProfile()
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      await screen.findByRole("button", { name: /search manually instead/i }),
    )
    await user.type(
      await screen.findByPlaceholderText(/kadamtala or 711101/i),
      "71110",
    )
    await user.click(screen.getByRole("button", { name: /^search$/i }))

    expect(
      await screen.findByText(/valid 6-digit Indian PIN/i),
    ).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.filter((call) =>
        call[0].toString().includes("/api/location/search"),
      ),
    ).toHaveLength(0)
  })

  it("location switching: switching from Location A to Location B uses B for the next request, and A does not remain authoritative", async () => {
    seedProfile()
    localStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify({
        latitude: 22.5726,
        longitude: 88.3639,
        locality: "Kolkata",
        region: "West Bengal",
        country: "India",
        timezone: "Asia/Kolkata",
        source: "device",
      }),
    )

    const user = userEvent.setup()
    render(<App />)

    // Location A (Kolkata) is authoritative first.
    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter((c) =>
        c[0].toString().includes("/api/weather"),
      )
      expect(calls.length).toBeGreaterThan(0)
    })
    const callsForA = fetchMock.mock.calls.filter((c) =>
      c[0].toString().includes("/api/weather"),
    )
    expect(
      new URL(callsForA[0][0].toString()).searchParams.get("latitude"),
    ).toBe("22.5726")

    // Switch to Location B (Mumbai, via manual search).
    await user.click(
      await screen.findByRole("button", { name: /change location/i }),
    )
    await user.click(
      await screen.findByRole("button", { name: /search manually instead/i }),
    )
    await user.type(
      await screen.findByPlaceholderText(/kadamtala or 711101/i),
      "Mumbai",
    )
    await user.click(screen.getByRole("button", { name: /^search$/i }))
    await user.click(
      await screen.findByRole("button", { name: /Mumbai · 400001/i }),
    )

    // Complete the Ready slider
    await waitFor(() =>
      expect(screen.getByText(/SLIDE TO DIVE IN/i)).toBeInTheDocument(),
    )
    const slider = screen.getByLabelText(/Slide to enter Mausam/i)
    Object.defineProperty(slider, "value", { value: "100", writable: true })
    slider.dispatchEvent(new Event("input", { bubbles: true }))
    slider.dispatchEvent(new Event("change", { bubbles: true }))

    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter((c) =>
        c[0].toString().includes("/api/weather"),
      )
      const last = calls[calls.length - 1]
      expect(new URL(last[0].toString()).searchParams.get("latitude")).toBe(
        "19.07",
      )
    })

    expect(
      await screen.findByText("Mumbai · 400001, Maharashtra"),
    ).toBeInTheDocument()

    // The rendered temperature must reflect B (33°, per the fetch mock),
    // not A's stale 29° — proving A is no longer authoritative.
    await screen.findByText(/33/)
  })

  it("is_day=0 (night) does not render a daytime sun icon for a clear condition", async () => {
    seedProfile()
    localStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify({
        latitude: 22.5726,
        longitude: 88.3639,
        locality: "Kolkata",
        region: "West Bengal",
        country: "India",
        timezone: "Asia/Kolkata",
        source: "device",
      }),
    )
    fetchMock.mockImplementation(async (input: string | URL) => {
      const url = input.toString()
      if (url.includes("/api/weather")) {
        const fixture = weatherFixture()
        fixture.current.isDay = false
        fixture.hourly = [
          {
            time: "Now",
            temperature: 24,
            condition: "Clear sky",
            conditionCode: "clear",
            rainChance: 5,
          },
        ]
        return { ok: true, json: async () => fixture }
      }
      return { ok: true, json: async () => ({}) }
    })

    render(<App />)

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((c) =>
          c[0].toString().includes("/api/weather"),
        ),
      ).toBe(true),
    )
    // Scoped to the "Now" hourly icon specifically — the 7-day forecast's
    // daily icons intentionally always use the daytime glyph (they
    // summarize a whole day, not a single instant), so a document-wide
    // "no sun anywhere" assertion would be wrong, not this behavior.
    const nowIcon = await screen.findByTestId("hourly-now-icon")
    expect(nowIcon).toHaveTextContent("🌙")
    expect(nowIcon).not.toHaveTextContent("☀️")
    const hero = document.querySelector(".weather-hero-card")
    expect(hero).toHaveAttribute("data-weather-variant", "night")
    expect(screen.getByLabelText(/animated smiling moon/i)).toBeInTheDocument()
  })

  it("Homepage and personalized page render figures derived from the SAME weather object (no duplicated/independent data)", async () => {
    seedProfile()
    localStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify({
        latitude: 22.5726,
        longitude: 88.3639,
        locality: "Kolkata",
        region: "West Bengal",
        country: "India",
        timezone: "Asia/Kolkata",
        source: "device",
      }),
    )
    fetchMock.mockImplementation(async (input: string | URL) => {
      const url = input.toString()
      if (url.includes("/api/weather")) {
        // A distinctive, unlikely-to-collide temperature proves the same
        // object flowed to both views rather than two independently
        // fetched/computed values happening to agree by coincidence.
        return {
          ok: true,
          json: async () =>
            weatherFixture({
              current: { ...weatherFixture().current, temperature: 27 },
            }),
        }
      }
      if (url.includes("/api/personalized-briefing"))
        return { ok: false, status: 500, json: async () => ({}) }
      return { ok: true, json: async () => ({}) }
    })

    const user = userEvent.setup()
    render(<App />)

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((c) =>
          c[0].toString().includes("/api/weather"),
        ),
      ).toBe(true),
    )
    expect(await screen.findByText("27")).toBeInTheDocument() // Homepage temperature

    await user.click(
      await screen.findByRole("button", {
        name: /open your personalised weather briefing/i,
      }),
    )
    // The personalized page shows the same temperature (in both the
    // summary pill and the "why" panel), sourced from the identical
    // weather object — not a separately fetched/computed value.
    expect((await screen.findAllByText("27°C")).length).toBeGreaterThan(0)
  })

  it("does not inject DEMO_WEATHER_DATA fields into a successful live response", async () => {
    seedProfile()
    localStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify({
        latitude: 22.5726,
        longitude: 88.3639,
        locality: "Kolkata",
        region: "West Bengal",
        country: "India",
        timezone: "Asia/Kolkata",
        source: "device",
      }),
    )

    render(<App />)

    // The live fixture's distinctive city label should render; the demo
    // dataset's distinctive alert/commute text must NOT appear anywhere,
    // proving no silent merge occurred.
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((c) =>
          c[0].toString().includes("/api/weather"),
        ),
      ).toBe(true),
    )
    await screen.findAllByText(/Kolkata/i)
    expect(screen.queryByText(/EM Bypass/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Ganga Ferry/i)).not.toBeInTheDocument()
  })
})
