import { describe, expect, it } from "vitest"
import { validateBriefingResponse } from "../src/briefing/validateBriefingResponse.js"
import { buildPersonalizedBriefing } from "../src/briefing/buildPersonalizedBriefing.js"
import { buildBaseWeather } from "./briefingFixtures.js"

function validBody() {
  return {
    title: "Outdoor Outlook",
    summary: "Conditions look favorable for outdoor activity today.",
    recommendation: "This is a good day to be outside.",
    bestWindow: {
      start: "Now",
      end: "3 pm",
      reason: "Now–3 pm offers the most favorable stretch of conditions today.",
    },
    risks: [],
    actions: ["Enjoy outdoor activity — conditions are favorable today"],
    dataContext: { temperature: 26, rainChance: 10, uvIndex: 3, aqi: 35 },
    generatedAt: new Date().toISOString(),
  }
}

describe("validateBriefingResponse", () => {
  it("accepts a real generator output unchanged", () => {
    const briefing = buildPersonalizedBriefing(buildBaseWeather(), {
      persona: "outdoor",
    })
    expect(() => validateBriefingResponse(briefing)).not.toThrow()
  })

  it("accepts a valid, hand-built response", () => {
    expect(() => validateBriefingResponse(validBody())).not.toThrow()
  })

  it("rejects a response missing required fields", () => {
    const body = validBody() as any
    delete body.summary
    expect(() => validateBriefingResponse(body)).toThrow()
  })

  it("rejects an invalid risk severity", () => {
    const body = validBody() as any
    body.risks = [{ type: "rain", severity: "catastrophic", message: "x" }]
    expect(() => validateBriefingResponse(body)).toThrow()
  })

  it("rejects a title exceeding the length limit", () => {
    const body = validBody() as any
    body.title = "a".repeat(200)
    expect(() => validateBriefingResponse(body)).toThrow()
  })

  it("rejects a non-nullable-violating aqi type", () => {
    const body = validBody() as any
    body.dataContext.aqi = "high"
    expect(() => validateBriefingResponse(body)).toThrow()
  })

  it("accepts a null aqi value", () => {
    const body = validBody()
    body.dataContext.aqi = null
    expect(() => validateBriefingResponse(body)).not.toThrow()
  })

  it("rejects too many risks (defensive cap)", () => {
    const body = validBody() as any
    body.risks = Array.from({ length: 10 }, () => ({
      type: "rain",
      severity: "moderate",
      message: "x",
    }))
    expect(() => validateBriefingResponse(body)).toThrow()
  })
})
