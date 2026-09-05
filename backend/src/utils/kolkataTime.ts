// Open-Meteo is queried with `timezone=auto`, which — for Kolkata's
// coordinates — returns naive LOCAL (Asia/Kolkata) date/time strings with
// no UTC offset, e.g. "2026-09-05T12:04" or a date-only "2026-09-05".
//
// Two distinct needs arise from this, and conflating them is what caused
// the original timezone bug:
//
// 1. ASTRONOMY needs the correct ABSOLUTE INSTANT (a real point in time)
//    to compute sun/moon position. India uses a single fixed UTC+05:30
//    offset with no DST, so appending that literal offset to the naive
//    string always yields the correct instant — regardless of what
//    timezone the server process itself happens to run in.
//    Use `toKolkataInstant()` for this.
//
// 2. CALENDAR logic (month, weekday, "this weekend", display labels like
//    "5 PM" or "28 Aug") needs the Kolkata WALL-CLOCK date/time, not an
//    instant. Using a real Date's local getters (getMonth/getDay/
//    getHours) or `toLocaleString` without an explicit `timeZone` for
//    this would silently read the SERVER's timezone instead of
//    Kolkata's. Instead, `parseKolkataCalendarDate()` parses the Y/M/D/H/M
//    digits directly out of the naive string and encodes them as a
//    UTC-based Date (via Date.UTC). Consumers must then read it back with
//    UTC getters (getUTCMonth, getUTCDate, getUTCDay, ...) or format it
//    with `timeZone: 'UTC'` — both of which are immune to the server's
//    local timezone because UTC never consults it. Never read this Date
//    with local getters or default-timezone formatting.

const KOLKATA_UTC_OFFSET = '+05:30'

/**
 * Parses an Open-Meteo naive Kolkata-local string into the correct
 * absolute instant. Use only where a real point in time is required
 * (e.g. feeding an astronomical calculation) — not for calendar/weekday
 * logic (see parseKolkataCalendarDate).
 */
export function toKolkataInstant(naiveIsoString: string): Date {
  const hasTime = naiveIsoString.includes('T')
  const iso = hasTime ? `${naiveIsoString}${KOLKATA_UTC_OFFSET}` : `${naiveIsoString}T00:00:00${KOLKATA_UTC_OFFSET}`
  return new Date(iso)
}

const NAIVE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/

/**
 * Parses an Open-Meteo naive Kolkata-local string into a Date whose UTC
 * getters directly reflect the Kolkata wall-clock calendar values,
 * independent of the server's own local timezone. Read it back with
 * getUTC*() methods or format with `{ timeZone: 'UTC' }` — never with
 * local getters/default-timezone formatting, which would reintroduce the
 * server-timezone dependency this function exists to avoid.
 */
export function parseKolkataCalendarDate(naiveIsoString: string): Date {
  const match = NAIVE_PATTERN.exec(naiveIsoString)
  if (!match) {
    throw new Error(`Unrecognized Open-Meteo date/time format: ${naiveIsoString}`)
  }
  const [, year, month, day, hour = '0', minute = '0'] = match
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)))
}
