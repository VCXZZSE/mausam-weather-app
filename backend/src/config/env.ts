import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  ALLOWED_ORIGINS: z
    .string()
    // 8443 is the frontend's actual Vite dev-server default (see
    // vite.config.ts); 5173 is Vite's own generic default, kept as a
    // fallback for anyone overriding PORT locally.
    .default('http://localhost:8443,http://localhost:5173')
    .transform(value => value.split(',').map(origin => origin.trim()).filter(Boolean)),
  WEATHER_CACHE_TTL_MS: z.coerce.number().int().min(10_000).default(300_000),
  OPEN_METEO_BASE_URL: z.string().url().default('https://api.open-meteo.com/v1/forecast'),
  OPEN_METEO_AIR_QUALITY_URL: z.string().url().default('https://air-quality-api.open-meteo.com/v1/air-quality'),
  AIR_QUALITY_CACHE_TTL_MS: z.coerce.number().int().min(10_000).default(600_000),
  // Used only when a request omits explicit coordinates. Per the v0.2
  // location-first spec, this is meant strictly as a clearly-labelled,
  // deliberately-selected demo location, not a silent substitution — the
  // route marks such responses with `source: 'default'` and callers
  // (e.g. curl, tests, or a frontend "use demo location" action) can set
  // ALLOW_DEFAULT_LOCATION=false to require explicit coordinates instead.
  ALLOW_DEFAULT_LOCATION: z
    .string()
    .default('true')
    .transform(value => value.trim().toLowerCase() !== 'false'),
  DEFAULT_LATITUDE: z.coerce.number().default(22.5726),
  DEFAULT_LONGITUDE: z.coerce.number().default(88.3639),
  DEFAULT_CITY: z.string().default('Kolkata'),
  DEFAULT_REGION: z.string().default('West Bengal'),
  // Manual location search — Open-Meteo's own geocoding API, free, no key.
  OPEN_METEO_GEOCODING_URL: z.string().url().default('https://geocoding-api.open-meteo.com/v1/search'),
  LOCATION_SEARCH_CACHE_TTL_MS: z.coerce.number().int().min(10_000).default(3_600_000),
  // Reverse geocoding (device coordinates -> place name) — Nominatim
  // (OpenStreetMap), free, no key, but its usage policy requires a
  // descriptive User-Agent, attribution, and a max of ~1 request/second.
  NOMINATIM_BASE_URL: z.string().url().default('https://nominatim.openstreetmap.org/reverse'),
  NOMINATIM_USER_AGENT: z.string().default('MausamWeatherApp/1.0 (SIH demo; contact: local-dev)'),
  REVERSE_GEOCODE_CACHE_TTL_MS: z.coerce.number().int().min(60_000).default(86_400_000),
  REVERSE_GEOCODE_MIN_INTERVAL_MS: z.coerce.number().int().min(200).default(1_000),
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`)
  }
  return parsed.data
}
