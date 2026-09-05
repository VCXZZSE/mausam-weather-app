import { z } from "zod"

export type OpenMeteoCoordinates = {
  latitude: number
  longitude: number
}

// Runtime validation of the actual fields the normalizer reads (see
// normalizers/toDashboardWeatherData.ts). Rejects malformed/incomplete
// responses (missing fields, wrong types, empty arrays) rather than
// letting `undefined`/`NaN` silently propagate into DashboardWeatherData —
// mirrors the shape-check already used by openMeteoAirQualityClient.ts.
const numberArray = z.array(z.number())

const openMeteoResponseSchema = z.object({
  // Open-Meteo always returns these two top-level fields for the
  // requested coordinates when timezone=auto is used. They replace the
  // old hardcoded Asia/Kolkata assumption (see utils/locationTime.ts).
  timezone: z.string().min(1),
  utc_offset_seconds: z.number(),
  current_weather: z.object({
    time: z.string().min(1),
    temperature: z.number(),
    windspeed: z.number(),
    winddirection: z.number(),
    weathercode: z.number(),
    // Open-Meteo always includes this alongside current_weather=true — 1
    // during daylight, 0 at night — used so a "clear" condition doesn't
    // render a sun icon after dark (see conditionCode.ts / dashboard.ts).
    is_day: z.number(),
  }),
  hourly: z.object({
    time: z.array(z.string()).min(1),
    temperature_2m: numberArray,
    apparent_temperature: numberArray,
    relative_humidity_2m: numberArray,
    surface_pressure: numberArray,
    dew_point_2m: numberArray,
    visibility: numberArray,
    wind_gusts_10m: numberArray,
    weathercode: numberArray,
    precipitation_probability: numberArray,
    uv_index: numberArray,
    is_day: numberArray,
  }),
  daily: z.object({
    time: z.array(z.string()).min(1),
    temperature_2m_max: numberArray,
    temperature_2m_min: numberArray,
    weathercode: numberArray,
    precipitation_probability_max: numberArray,
    precipitation_sum: numberArray,
    uv_index_max: numberArray,
    sunrise: z.array(z.string()).min(1),
    sunset: z.array(z.string()).min(1),
  }),
})

export type OpenMeteoResponse = z.infer<typeof openMeteoResponseSchema>

const HOURLY_VARS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "surface_pressure",
  "dew_point_2m",
  "visibility",
  "wind_gusts_10m",
  "weathercode",
  "precipitation_probability",
  "uv_index",
  "is_day",
].join(",")

const DAILY_VARS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "weathercode",
  "precipitation_probability_max",
  "precipitation_sum",
  "uv_index_max",
  "sunrise",
  "sunset",
].join(",")

export type FetchOpenMeteoOptions = {
  baseUrl: string
  coordinates: OpenMeteoCoordinates
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export async function fetchOpenMeteoData(
  options: FetchOpenMeteoOptions,
): Promise<OpenMeteoResponse> {
  const { baseUrl, coordinates, timeoutMs = 8000, fetchImpl = fetch } = options

  const url = new URL(baseUrl)
  url.searchParams.set("latitude", String(coordinates.latitude))
  url.searchParams.set("longitude", String(coordinates.longitude))
  url.searchParams.set("current_weather", "true")
  url.searchParams.set("hourly", HOURLY_VARS)
  url.searchParams.set("daily", DAILY_VARS)
  url.searchParams.set("timezone", "auto")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url.toString(), {
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(
        `Open-Meteo request failed with status ${response.status}`,
      )
    }
    const body: unknown = await response.json()
    const result = openMeteoResponseSchema.safeParse(body)
    if (!result.success) {
      // Deliberately generic: never forward the raw provider payload or
      // zod's internal issue paths to callers — this error is only ever
      // logged server-side (see routes/weather.ts) and triggers the
      // existing cache/last-good/502 fallback path.
      throw new Error("Open-Meteo forecast response failed validation")
    }
    return result.data
  } finally {
    clearTimeout(timeout)
  }
}
