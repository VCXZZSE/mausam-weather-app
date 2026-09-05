import { z } from 'zod'
import type { BriefingResponse } from './types.js'

const briefingResponseSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(400),
  recommendation: z.string().min(1).max(300),
  bestWindow: z.object({
    start: z.string(),
    end: z.string(),
    reason: z.string().min(1).max(200),
  }),
  risks: z.array(z.object({
    type: z.string().min(1),
    severity: z.enum(['moderate', 'high', 'severe']),
    message: z.string().min(1).max(240),
  })).max(6),
  actions: z.array(z.string().min(1).max(160)).max(6),
  dataContext: z.object({
    temperature: z.number(),
    rainChance: z.number(),
    uvIndex: z.number(),
    aqi: z.number().nullable(),
  }),
  generatedAt: z.string(),
})

/**
 * Validates a generated briefing before it is ever sent to the client.
 * This is what makes the future-LLM seam safe: whatever produces the
 * BriefingResponse (deterministic today, potentially model-based later),
 * the route can never forward malformed JSON.
 */
export function validateBriefingResponse(value: unknown): BriefingResponse {
  const result = briefingResponseSchema.safeParse(value)
  if (!result.success) {
    throw new Error('Generated briefing failed validation')
  }
  return result.data
}
