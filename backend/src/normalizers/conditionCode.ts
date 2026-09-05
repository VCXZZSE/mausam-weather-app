// Maps WMO weather codes (used by Open-Meteo) to the frontend's internal
// conditionCode enum (see src/weatherData.ts CONDITION_ICONS keys).

export type ConditionInfo = { conditionCode: string condition: string }

const WMO_CONDITIONS: Record<number, ConditionInfo> = {
  0: { conditionCode: "clear", condition: "Clear sky" },
  1: { conditionCode: "fair", condition: "Mainly clear" },
  2: { conditionCode: "partly_cloudy", condition: "Partly cloudy" },
  3: { conditionCode: "overcast", condition: "Overcast" },
  45: { conditionCode: "fog", condition: "Fog" },
  48: { conditionCode: "fog", condition: "Depositing rime fog" },
  51: { conditionCode: "drizzle", condition: "Light drizzle" },
  53: { conditionCode: "drizzle", condition: "Moderate drizzle" },
  55: { conditionCode: "drizzle", condition: "Dense drizzle" },
  56: { conditionCode: "drizzle", condition: "Freezing drizzle" },
  57: { conditionCode: "drizzle", condition: "Dense freezing drizzle" },
  61: { conditionCode: "rain", condition: "Slight rain" },
  63: { conditionCode: "rain", condition: "Moderate rain" },
  65: { conditionCode: "heavy_rain", condition: "Heavy rain" },
  66: { conditionCode: "rain", condition: "Freezing rain" },
  67: { conditionCode: "heavy_rain", condition: "Heavy freezing rain" },
  71: { conditionCode: "snow", condition: "Slight snow" },
  73: { conditionCode: "snow", condition: "Moderate snow" },
  75: { conditionCode: "snow", condition: "Heavy snow" },
  77: { conditionCode: "snow", condition: "Snow grains" },
  80: { conditionCode: "showers", condition: "Slight showers" },
  81: { conditionCode: "showers", condition: "Moderate showers" },
  82: { conditionCode: "heavy_rain", condition: "Violent showers" },
  85: { conditionCode: "snow", condition: "Slight snow showers" },
  86: { conditionCode: "snow", condition: "Heavy snow showers" },
  95: { conditionCode: "thunderstorm", condition: "Thunderstorm" },
  96: { conditionCode: "storm", condition: "Thunderstorm with hail" },
  99: { conditionCode: "storm", condition: "Severe thunderstorm with hail" },
}

export function resolveCondition(weatherCode: number): ConditionInfo {
  return (
    WMO_CONDITIONS[weatherCode] ?? {
      conditionCode: "cloudy",
      condition: "Cloudy",
    }
  )
}

export function resolveHeroVariant(
  conditionCode: string,
  condition = "",
  isDay?: boolean,
): "rainy" | "sunny" | "night" {
  if (
    /rain|storm|shower|drizzle|thunder/i.test(`${conditionCode} ${condition}`)
  )
    return "rainy"
  return isDay === false ? "night" : "sunny"
}

const COMPASS_POINTS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
]

export function degreesToCompass(degrees: number): string {
  const index = Math.round((degrees % 360) / 22.5) % 16
  return COMPASS_POINTS[(index + 16) % 16]
}
