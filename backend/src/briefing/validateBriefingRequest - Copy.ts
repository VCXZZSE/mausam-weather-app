import { z } from "zod"
import type { BriefingRequest } from "./types.js"

const briefingRequestSchema = z.object({
  persona: z
    .enum(["commuter", "student", "outdoor", "health", "general"])
    .default("general"),
  activity: z.string().trim().min(1).max(60).optional(),
  sensitivity: z.enum(["low", "normal", "high"]).optional(),
  location: z.string().trim().min(1).max(80).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
})

/**
 * Validates and normalizes the personalized-briefing request body. Throws
 * on any invalid input (unknown persona/sensitivity, oversized strings,
 * wrong types) — the route converts this into a 400 response.
 */
export function validateBriefingRequest(value: unknown): BriefingRequest {
  const result = briefingRequestSchema.safeParse(value)
  if (!result.success) {
    throw new Error("Invalid personalized briefing request")
  }
  return result.data
}
