export type OpenMeteoAirQualityResponse = {
  hourly: {
    time: string[]
    pm2_5: number[]
    pm10: number[]
    ozone: number[]
    nitrogen_dioxide: number[]
    us_aqi: number[]
  }
}

const HOURLY_VARS = [
  "pm2_5",
  "pm10",
  "ozone",
  "nitrogen_dioxide",
  "us_aqi",
].join(",")

export type FetchOpenMeteoAirQualityOptions = {
  baseUrl: string
  coordinates: { latitude: number longitude: number }
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export async function fetchOpenMeteoAirQuality(
  options: FetchOpenMeteoAirQualityOptions,
): Promise<OpenMeteoAirQualityResponse> {
  const { baseUrl, coordinates, timeoutMs = 8000, fetchImpl = fetch } = options

  const url = new URL(baseUrl)
  url.searchParams.set("latitude", String(coordinates.latitude))
  url.searchParams.set("longitude", String(coordinates.longitude))
  url.searchParams.set("hourly", HOURLY_VARS)
  url.searchParams.set("timezone", "auto")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url.toString(), {
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(
        `Open-Meteo Air Quality request failed with status ${response.status}`,
      )
    }
    const body = (await response.json()) as OpenMeteoAirQualityResponse
    if (!body.hourly || !Array.isArray(body.hourly.time)) {
      throw new Error(
        "Open-Meteo Air Quality response is missing expected hourly data",
      )
    }
    return body
  } finally {
    clearTimeout(timeout)
  }
}
