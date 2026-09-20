import type { WeatherPayload } from "../normalizers/toDashboardWeatherData.js"
import type { BriefingRequest, BriefingResponse } from "./types.js"

/**
 * Seam for briefing sources. Ships with DeterministicBriefingGenerator.
 * Alternative briefing generators can implement this same interface
 * without any change to routes/personalizedBriefing.ts.
 */
export interface BriefingGenerator {
  generate(weather: WeatherPayload, request: BriefingRequest): BriefingResponse
}
