import type { WeatherPayload } from "../normalizers/toDashboardWeatherData.js"
import type { BriefingGenerator } from "./BriefingGenerator.js"
import type { BriefingRequest, BriefingResponse } from "./types.js"
import { buildPersonalizedBriefing } from "./buildPersonalizedBriefing.js"

export class DeterministicBriefingGenerator implements BriefingGenerator {
  generate(
    weather: WeatherPayload,
    request: BriefingRequest,
  ): BriefingResponse {
    return buildPersonalizedBriefing(weather, request)
  }
}
