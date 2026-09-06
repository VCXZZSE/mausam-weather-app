// Open-Meteo (queried with `timezone=auto`) returns naive LOCAL date/time
// strings with no UTC offset, e.g. "2026-09-05T12:04" or a date-only
// "2026-09-05" — local to whatever coordinates were requested, not
// necessarily Kolkata. This file used to hardcode Asia/Kolkata's fixed
// +05:30 offset (see backend-v0.2 handoff §7, "Remove Kolkata-only time
// handling"); it now takes the offset/timezone returned by Open-Meteo
// itself for the requested coordinates, so any location's time is handled
// correctly.
//
// Two distinct needs still apply:
//
// 1. Real INSTANT math (e.g. feeding astronomical calculations) needs
//    `toLocationInstant()` with the location's `utcOffsetSeconds`.
// 2. CALENDAR logic (month, weekday, display labels) needs
//    `parseLocalCalendarDate()`, which is offset-independent by
//    construction — it reads the Y/M/D/H/M digits directly out of the
//    already-local string Open-Meteo returned, with no timezone
//    conversion at all. Read it back only via getUTC*()/`timeZone:'UTC'`.

function formatOffset(utcOffsetSeconds: number): string {
  const sign = utcOffsetSeconds < 0 ? "-" : "+"
  const absMinutes = Math.round(Math.abs(utcOffsetSeconds) / 60)
  const hours = Math.floor(absMinutes / 60)
  const minutes = absMinutes % 60
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

/**
 * Parses an Open-Meteo naive local-time string into the correct absolute
 * instant, using the UTC offset (in seconds) Open-Meteo returned for the
 * requested coordinates. Use only where a real point in time is required
 * (e.g. feeding an astronomical calculation) — not for calendar/weekday
 * logic (see parseLocalCalendarDate).
 */
export function toLocationInstant(
  naiveIsoString: string,
  utcOffsetSeconds: number,
): Date {
  const offset = formatOffset(utcOffsetSeconds)
  const hasTime = naiveIsoString.includes("T")
  const iso = hasTime
    ? `${naiveIsoString}${offset}`
    : `${naiveIsoString}T00:00:00${offset}`
  return new Date(iso)
}

const NAIVE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/

/**
 * Parses an Open-Meteo naive local-time string into a Date whose UTC
 * getters directly reflect that location's wall-clock calendar values,
 * independent of the server's own local timezone AND independent of which
 * location was requested (no offset is applied — the string is already
 * local). Read it back with getUTC*() methods or format with
 * `{ timeZone: 'UTC' }` — never with local getters/default-timezone
 * formatting, which would reintroduce a server-timezone dependency.
 */
export function parseLocalCalendarDate(naiveIsoString: string): Date {
  const match = NAIVE_PATTERN.exec(naiveIsoString)
  if (!match) {
    throw new Error(
      `Unrecognized Open-Meteo date/time format: ${naiveIsoString}`,
    )
  }
  const [, year, month, day, hour = "0", minute = "0"] = match
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    ),
  )
}

/**
 * Formats an instant using the IANA timezone Open-Meteo returned for the
 * requested coordinates (e.g. "Asia/Kolkata", "America/New_York") —
 * replaces the old hardcoded 'Asia/Kolkata' constant.
 */
export function formatInLocationTimeZone(
  date: Date | undefined,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  if (!date || Number.isNaN(date.getTime())) return "—"
  return date.toLocaleTimeString("en-IN", { ...options, timeZone })
}
