import type { WeatherPayload } from "../normalizers/toDashboardWeatherData.js"
import type { BriefingRequest, BriefingResponse } from "./types.js"

/**
 * Seam for future briefing sources. v0.1 ships only
 * DeterministicBriefingGenerator (no LLM). A future generator backed by a
 * model provider could implement this same interface without any change
 * to routes/personalizedBriefing.ts — but is intentionally NOT implemented
 * in this phase.
 */
export interface BriefingGenerator {
  generate(weather: WeatherPayload, request: BriefingRequest): BriefingResponse
}
