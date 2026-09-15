import { describe, expect, it } from "vitest"
import { getTimeGreeting } from "../src/timeGreeting"

describe("getTimeGreeting", () => {
  it.each([
    ["2026-09-05T01:30:00.000Z", "Good morning"], // 07:00 IST
    ["2026-09-05T07:30:00.000Z", "Good afternoon"], // 13:00 IST
    ["2026-09-05T14:30:00.000Z", "Good evening"], // 20:00 IST
    ["2026-09-05T20:30:00.000Z", "Good night"], // 02:00 IST
  ])("uses the selected location time for %s", (iso, expected) => {
    expect(getTimeGreeting(new Date(iso), "Asia/Kolkata")).toBe(expected)
  })
})
