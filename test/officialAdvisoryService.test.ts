import { describe, expect, it } from "vitest"
import { advisoryQuerySchema, matchArea, parseOfficialCap, unavailableAdvisories } from "../lib/advisories/service"

const now = Date.parse("2026-09-06T12:00:00Z")
const cap = (changes = "") => `<cap:alert xmlns:cap="urn:oasis:names:tc:emergency:cap:1.2">
<cap:identifier>official-1</cap:identifier><cap:sender>IMD</cap:sender>
<cap:sent>2026-09-06T11:00:00Z</cap:sent><cap:status>Actual</cap:status>
<cap:scope>Public</cap:scope><cap:msgType>Alert</cap:msgType>
<cap:info><cap:language>en-IN</cap:language><cap:event>Heavy rain</cap:event>
<cap:headline>Official warning &amp; instructions</cap:headline><cap:severity>Severe</cap:severity>
<cap:expires>2026-09-06T15:00:00Z</cap:expires>
<cap:area><cap:areaDesc>Kolkata districts of West Bengal</cap:areaDesc></cap:area>
</cap:info>${changes}</cap:alert>`

describe("official government advisory boundaries", () => {
  it("matches districts exactly and never matches the issuing office", () => {
    expect(matchArea("Alipurduar,Birbhum,Koch Bihar districts of West Bengal", "Kolkata", "West Bengal")).toBe(false)
    expect(matchArea("Mumbai districts of Maharashtra", "Kolkata", "West Bengal")).toBe(false)
    expect(matchArea("Kolkata districts of West Bengal", "Kolkata District", "West Bengal")).toBe(true)
    expect(matchArea("West Bengal", undefined, "West Bengal")).toBe(true)
    expect(matchArea("22 Mandals", "Kolkata", "West Bengal")).toBeNull()
  })
  it("preserves official text and excludes expired, test, cancelled and foreign-area alerts", () => {
    const parse = (text: string, district = "Kolkata") => parseOfficialCap(text, "https://sachet.ndma.gov.in/", district, "West Bengal", now)
    expect(parse(cap())?.description).toBe("Official warning & instructions")
    expect(parse(cap(), "Howrah")).toBeNull()
    expect(parse(cap().replace("15:00:00", "11:30:00"))).toBeNull()
    expect(parse(cap().replace(">Actual<", ">Test<"))).toBeNull()
    expect(parse(cap().replace(">Alert<", ">Cancel<"))).toBeNull()
    expect(parse(cap().replace("11:00:00", "13:00:00"))).toBeNull()
  })
  it("rejects malformed XML, entities and missing validity", () => {
    const parse = (text: string) => parseOfficialCap(text, "https://sachet.ndma.gov.in/", "Kolkata", "West Bengal", now)
    expect(() => parse("<html>Unavailable</html>")).toThrow()
    expect(() => parse('<!DOCTYPE alert [<!ENTITY x "foo">]>' + cap())).toThrow()
    expect(() => parse(cap().replace("2026-09-06T15:00:00Z", ""))).toThrow()
  })
  it("requires valid coordinates and never reports all-clear on unavailable sources", () => {
    for (const latitude of ["", "NaN", "Infinity", "91", undefined]) {
      expect(advisoryQuerySchema.safeParse({ latitude, longitude: "88" }).success).toBe(false)
    }
    expect(advisoryQuerySchema.safeParse({ latitude: "22.57", longitude: "88.36", postalCode: "700001" }).success).toBe(true)
    expect(Object.values(unavailableAdvisories().categories).every(category => category.status === "unavailable")).toBe(true)
  })
})
