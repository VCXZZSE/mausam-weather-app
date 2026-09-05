import { describe, expect, it, vi } from "vitest"
import {
  fetchIndiaLocationSearch,
  fetchReverseGeocode,
} from "../src/providers/nominatimClient.js"

describe("Nominatim India location provider", () => {
  it("prefers a fine-grained neighbourhood and includes the PIN when reverse geocoding", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        display_name: "A road, Kadamtala, Haora, West Bengal, India",
        address: {
          road: "A road",
          neighbourhood: "Kadamtala",
          city: "Haora",
          state: "West Bengal",
          postcode: "711101",
          country: "India",
          country_code: "in",
        },
      }),
    })

    const result = await fetchReverseGeocode({
      baseUrl: "https://nominatim.openstreetmap.org/reverse",
      userAgent: "Mausam tests",
      minIntervalMs: 0,
      coordinates: { latitude: 22.59, longitude: 88.34 },
      fetchImpl,
    })

    expect(result).toMatchObject({
      locality: "Kadamtala",
      region: "West Bengal",
      country: "India",
      postalCode: "711101",
    })
    const calledUrl = new URL(fetchImpl.mock.calls[0][0])
    expect(calledUrl.searchParams.get("zoom")).toBe("18")
  })

  it("uses a structured India-only query for a six-digit PIN", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: "22.5972055",
          lon: "88.3459574",
          name: "711101",
          display_name: "711101, Haora, Howrah, West Bengal, India",
          address: {
            postcode: "711101",
            city: "Haora",
            municipality: "Kolkata Metropolitan Area",
            state: "West Bengal",
            country: "India",
            country_code: "in",
          },
        },
      ],
    })

    const results = await fetchIndiaLocationSearch({
      baseUrl: "https://nominatim.openstreetmap.org/search",
      userAgent: "Mausam tests",
      minIntervalMs: 0,
      query: "711101",
      fetchImpl,
    })

    expect(results).toEqual([
      expect.objectContaining({
        name: "Haora",
        postalCode: "711101",
        country: "India",
      }),
    ])
    const calledUrl = new URL(fetchImpl.mock.calls[0][0])
    expect(calledUrl.searchParams.get("postalcode")).toBe("711101")
    expect(calledUrl.searchParams.get("countrycodes")).toBe("in")
    expect(calledUrl.searchParams.has("q")).toBe(false)
  })

  it("filters out any foreign result even if a provider returns it", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: "51.5",
          lon: "-0.1",
          name: "London",
          address: {
            city: "London",
            country: "United Kingdom",
            country_code: "gb",
          },
        },
        {
          lat: "19.07",
          lon: "72.88",
          name: "Mumbai",
          address: {
            city: "Mumbai",
            state: "Maharashtra",
            country: "India",
            country_code: "in",
          },
        },
      ],
    })

    const results = await fetchIndiaLocationSearch({
      baseUrl: "https://nominatim.openstreetmap.org/search",
      userAgent: "Mausam tests",
      minIntervalMs: 0,
      query: "Mumbai",
      fetchImpl,
    })

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ name: "Mumbai", country: "India" })
  })
})
