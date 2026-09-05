export type OpenMeteoCoordinates = {
  latitude: number
  longitude: number
}

export type OpenMeteoResponse = {
  current_weather: {
    time: string
    temperature: number
    windspeed: number
    winddirection: number
    weathercode: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    apparent_temperature: number[]
    relative_humidity_2m: number[]
    surface_pressure: number[]
    dew_point_2m: number[]
    visibility: number[]
    wind_gusts_10m: number[]
    weathercode: number[]
    precipitation_probability: number[]
    uv_index: number[]
  }
  daily: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    weathercode: number[]
    precipitation_probability_max: number[]
    precipitation_sum: number[]
    uv_index_max: number[]
  }
}

const HOURLY_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'surface_pressure',
  'dew_point_2m',
  'visibility',
  'wind_gusts_10m',
  'weathercode',
  'precipitation_probability',
  'uv_index',
].join(',')

const DAILY_VARS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'weathercode',
  'precipitation_probability_max',
  'precipitation_sum',
  'uv_index_max',
].join(',')

export type FetchOpenMeteoOptions = {
  baseUrl: string
  coordinates: OpenMeteoCoordinates
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export async function fetchOpenMeteoData(options: FetchOpenMeteoOptions): Promise<OpenMeteoResponse> {
  const { baseUrl, coordinates, timeoutMs = 8000, fetchImpl = fetch } = options

  const url = new URL(baseUrl)
  url.searchParams.set('latitude', String(coordinates.latitude))
  url.searchParams.set('longitude', String(coordinates.longitude))
  url.searchParams.set('current_weather', 'true')
  url.searchParams.set('hourly', HOURLY_VARS)
  url.searchParams.set('daily', DAILY_VARS)
  url.searchParams.set('timezone', 'auto')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url.toString(), { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Open-Meteo request failed with status ${response.status}`)
    }
    return (await response.json()) as OpenMeteoResponse
  } finally {
    clearTimeout(timeout)
  }
}
