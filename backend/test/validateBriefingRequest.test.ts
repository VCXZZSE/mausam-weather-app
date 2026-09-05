import { describe, expect, it } from "vitest"
import { validateBriefingRequest } from "../src/briefing/validateBriefingRequest.js"

describe("validateBriefingRequest", () => {
  it("accepts a full valid request", () => {
    const result = validateBriefingRequest({
      persona: "outdoor",
      activity: "walking",
      sensitivity: "normal",
      location: "Kolkata",
    })
    expect(result.persona).toBe("outdoor")
    expect(result.activity).toBe("walking")
  })

  it('defaults persona to "general" when omitted', () => {
    const result = validateBriefingRequest({})
    expect(result.persona).toBe("general")
  })

  it("rejects an invalid persona", () => {
    expect(() => validateBriefingRequest({ persona: "astronaut" })).toThrow()
  })

  it("rejects an invalid sensitivity", () => {
    expect(() =>
      validateBriefingRequest({ persona: "general", sensitivity: "extreme" }),
    ).toThrow()
  })

  it("rejects a non-object body", () => {
    expect(() => validateBriefingRequest("not-an-object")).toThrow()
    expect(() => validateBriefingRequest(null)).toThrow()
    expect(() => validateBriefingRequest(undefined)).toThrow()
  })

  it("rejects an oversized activity string", () => {
    expect(() =>
      validateBriefingRequest({
        persona: "general",
        activity: "a".repeat(200),
      }),
    ).toThrow()
  })

  it("rejects a non-string location", () => {
    expect(() =>
      validateBriefingRequest({ persona: "general", location: 12345 }),
    ).toThrow()
  })
})
