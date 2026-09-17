export interface WeatherData {
  temp: number
  feelsLike: number
  city: string
  condition: string
  conditionKey: ConditionKey
  nextHours: number
  loading: boolean
  error: boolean
}

export type ConditionKey =
  | 'clear' | 'partly-cloudy' | 'cloudy' | 'foggy'
  | 'drizzle' | 'rain' | 'heavy-rain'
  | 'snow' | 'thunderstorm' | 'unknown'

interface WMOEntry { label: string; key: ConditionKey }

const WMO: Record<number, WMOEntry> = {
  0:  { label: 'clear',        key: 'clear'         },
  1:  { label: 'mostly clear', key: 'clear'         },
  2:  { label: 'partly cloudy',key: 'partly-cloudy' },
  3:  { label: 'overcast',     key: 'cloudy'        },
  45: { label: 'foggy',        key: 'foggy'         },
  48: { label: 'foggy',        key: 'foggy'         },
  51: { label: 'drizzle',      key: 'drizzle'       },
  53: { label: 'drizzle',      key: 'drizzle'       },
  55: { label: 'drizzle',      key: 'drizzle'       },
  61: { label: 'rain',         key: 'rain'          },
  63: { label: 'rain',         key: 'rain'          },
  65: { label: 'heavy rain',   key: 'heavy-rain'    },
  71: { label: 'snow',         key: 'snow'          },
  73: { label: 'snow',         key: 'snow'          },
  75: { label: 'heavy snow',   key: 'snow'          },
  80: { label: 'showers',      key: 'rain'          },
  81: { label: 'showers',      key: 'rain'          },
  82: { label: 'showers',      key: 'heavy-rain'    },
  95: { label: 'thunderstorm', key: 'thunderstorm'  },
  96: { label: 'thunderstorm', key: 'thunderstorm'  },
  99: { label: 'thunderstorm', key: 'thunderstorm'  },
}

export function decodeWMO(code: number): WMOEntry {
  if (WMO[code]) return WMO[code]
  const keys = Object.keys(WMO).map(Number).sort((a, b) => b - a)
  const match = keys.find(k => k <= code)
  return match !== undefined ? WMO[match] : { label: 'unknown', key: 'unknown' }
}

export async function fetchWeather(lat: number, lon: number, city: string): Promise<Partial<WeatherData>> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code` +
    `&hourly=weather_code&timezone=auto&forecast_days=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error('open-meteo error')
  const data = await res.json()

  const temp      = Math.round(data.current.temperature_2m)
  const feelsLike = Math.round(data.current.apparent_temperature)
  const { label: condition, key: conditionKey } = decodeWMO(data.current.weather_code)

  const now         = new Date().getHours()
  const hourlyCodes = data.hourly.weather_code as number[]
  let nextHours = 2
  for (let i = now + 1; i <= now + 4 && i < hourlyCodes.length; i++) {
    if (decodeWMO(hourlyCodes[i]).key !== conditionKey) { nextHours = i - now; break }
  }

  return { temp, feelsLike, city, condition, conditionKey, nextHours }
}
