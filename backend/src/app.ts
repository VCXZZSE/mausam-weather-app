import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import type { Env } from './config/env.js'
import { registerErrorHandler } from './middleware/errorHandler.js'
import { healthRoute } from './routes/health.js'
import { createWeatherCache, weatherRoute } from './routes/weather.js'

export async function buildApp(env: Env): Promise<FastifyInstance> {
  const app = Fastify({ logger: true })

  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS,
  })

  registerErrorHandler(app)

  await app.register(healthRoute)
  await app.register(weatherRoute, { env, cache: createWeatherCache(env) })

  return app
}
