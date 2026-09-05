import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform(value => value.split(',').map(origin => origin.trim()).filter(Boolean)),
  WEATHER_CACHE_TTL_MS: z.coerce.number().int().min(10_000).default(300_000),
  OPEN_METEO_BASE_URL: z.string().url().default('https://api.open-meteo.com/v1/forecast'),
  DEFAULT_LATITUDE: z.coerce.number().default(22.5726),
  DEFAULT_LONGITUDE: z.coerce.number().default(88.3639),
  DEFAULT_CITY: z.string().default('Kolkata'),
  DEFAULT_REGION: z.string().default('West Bengal'),
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`)
  }
  return parsed.data
}
