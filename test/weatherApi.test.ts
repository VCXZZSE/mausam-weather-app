import { afterEach, describe, expect, it, vi } from "vitest"

const { fetchForecast } = vi.hoisted(() => ({ fetchForecast: vi.fn() }))
vi.mock("../lib/providers/openMeteoClient.js", async importOriginal => ({
  ...await importOriginal<object>(), fetchOpenMeteoData: fetchForecast,
}))
vi.mock("../lib/aqi/resolveAirQuality.js", () => ({
  createAirQualityCaches: () => ({}), resolveAirQuality: async () => undefined,
}))
vi.mock("../lib/normalizers/toDashboardWeatherData.js", () => ({
  toDashboardWeatherData: (data: any) => ({ code: data.current_weather.weathercode }),
}))

function forecast(code = 0, ageMinutes = 0) {
  return {
    utc_offset_seconds: 19800,
    current_weather: {
      time: new Date(Date.now() + 19800_000 - ageMinutes * 60_000).toISOString().slice(0, 16),
      weathercode: code,
    },
  }
}

function response() {
  return { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  fetchForecast.mockReset()
  vi.resetModules()
})

describe("serverless current weather freshness", () => {
  it("returns unavailable on expired cache + provider failure, then recovers with new conditions", async () => {
    vi.stubEnv("WEATHER_CACHE_TTL_MS", "10000")
    let now = Date.now()
    vi.spyOn(Date, "now").mockImplementation(() => now)
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { default: handler } = await import("../api/weather")
    const req = { method: "GET", query: { latitude: "22.5", longitude: "88.3" } }
    fetchForecast.mockResolvedValueOnce(forecast())
    const first = response()
    await handler(req, first)
    expect(first.json).toHaveBeenCalledWith({ code: 0 })
    expect(first.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store")
    now += 10001
    fetchForecast.mockRejectedValueOnce(new Error("offline"))
    const failed = response()
    await handler(req, failed)
    expect(failed.status).toHaveBeenCalledWith(502)
    fetchForecast.mockResolvedValueOnce(forecast(61))
    const recovered = response()
    await handler(req, recovered)
    expect(recovered.json).toHaveBeenCalledWith({ code: 61 })
  })

  it("rejects yesterday's provider timestamp even when the HTTP request succeeds", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { default: handler } = await import("../api/weather")
    fetchForecast.mockResolvedValueOnce(forecast(95, 1440))
    const res = response()
    await handler({ method: "GET", query: { latitude: "22.5", longitude: "88.3" } }, res)
    expect(res.status).toHaveBeenCalledWith(502)
  })
})
