import { afterEach, describe, expect, it, vi } from "vitest"
import { buildApp } from "../src/app.js"
import { loadEnv } from "../src/config/env.js"

describe("GET /api/location/search", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("rejects an incomplete numeric Indian PIN before contacting a provider", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const app = await buildApp(loadEnv({}))

    const response = await app.inject({
      method: "GET",
      url: "/api/location/search?query=71110",
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error).toMatch(/6 digits/i)
    expect(fetchMock).not.toHaveBeenCalled()
    await app.close()
  })

  it("returns only an India-scoped PIN result with attribution", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            lat: "22.5972055",
            lon: "88.3459574",
            name: "711101",
            address: {
              postcode: "711101",
              city: "Haora",
              state: "West Bengal",
              country: "India",
              country_code: "in",
            },
          },
        ],
      }))
    const app = await buildApp(
      loadEnv({ REVERSE_GEOCODE_MIN_INTERVAL_MS: "200" }),
    )

    const response = await app.inject({
      method: "GET",
      url: "/api/location/search?query=711101",
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      countryScope: "IN",
      attribution: "© OpenStreetMap contributors",
      results: [
        expect.objectContaining({
          name: "Haora",
          postalCode: "711101",
          country: "India",
        }),
      ],
    })
    await app.close()
  })
})
