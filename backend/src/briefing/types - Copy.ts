export type Persona = "commuter" | "student" | "outdoor" | "health" | "general"
export type Sensitivity = "low" | "normal" | "high"
export type RiskSeverity = "moderate" | "high" | "severe"

export type BriefingRequest = {
  persona: Persona
  activity?: string
  sensitivity?: Sensitivity
  location?: string
  // v0.2 location-first architecture: when supplied, the briefing must
  // reason over weather for THESE coordinates (reusing the same
  // coordinate-keyed cache as GET /api/weather), not a hardcoded default.
  latitude?: number
  longitude?: number
}

export type BriefingRisk = {
  type: string
  severity: RiskSeverity
  message: string
}

export type BestWindow = {
  start: string
  end: string
  reason: string
}

export type BriefingResponse = {
  title: string
  summary: string
  recommendation: string
  bestWindow: BestWindow
  risks: BriefingRisk[]
  actions: string[]
  dataContext: {
    temperature: number
    rainChance: number
    uvIndex: number
    aqi: number | null
  }
  generatedAt: string
}
