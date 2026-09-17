// Locale-aware formatting for the numbers and timestamps the dashboard renders.
//
// Every reading the UI shows — 28°, 6 km/h, 90%, 9.2 km, "4:00 pm" — used to be
// interpolated with a bare template literal, so it looked identical in all three
// languages: English grouping, English decimal separator, English clock. This
// module is the single place that turns a raw reading into display text, so a
// language change moves the numbers too, not just the words around them.
//
// Numerals: all three locales are pinned to Latin digits (`-u-nu-latn`). Hindi
// already defaults to Latin in CLDR; Bengali defaults to Bengali digits
// (২৮ instead of 28), which is correct for prose but wrong for this UI — the
// dense metric chrome mixes readings with Latin acronyms (AQI, UV, PM2.5, SPF)
// and is read at a glance. Grouping and decimal separators still follow the
// locale, so the Indian lakh/crore grouping applies throughout. Switching a
// language to native digits later is a one-line change to NUMBER_LOCALES.

// Type-only import: translations.ts calls formatNumber from its own
// interpolator, so a value import here would close a module cycle.
import type { Language } from "./bundles/coreTranslations"

/** Number locale per language. `-u-nu-latn` pins Latin digits (see above). */
const NUMBER_LOCALES: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN-u-nu-latn",
  bn: "bn-IN-u-nu-latn",
}

/** Date/time locale per language — same digits, localised months and weekdays. */
const DATE_LOCALES: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN-u-nu-latn",
  bn: "bn-IN-u-nu-latn",
}

/** Mirrors DEFAULT_LANGUAGE, which cannot be imported here (see above). */
const FALLBACK_LANGUAGE: Language = "en"

function resolve(language: Language): Language {
  return language in NUMBER_LOCALES ? language : FALLBACK_LANGUAGE
}

// Intl formatters are expensive to construct and these run inside list renders
// (24 hourly chips, 7 daily rows) on every language change, so they are cached
// by locale plus the options that produced them.
const numberFormatters = new Map<string, Intl.NumberFormat>()

function numberFormatter(
  language: Language,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const locale = NUMBER_LOCALES[resolve(language)]
  const key = `${locale}|${options ? JSON.stringify(options) : ""}`
  let formatter = numberFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options)
    numberFormatters.set(key, formatter)
  }
  return formatter
}

/**
 * Formats one reading for display in `language`.
 *
 * Non-numeric input is passed through untouched rather than rendered as "NaN":
 * several payload fields are optional, and a few carry a placeholder ("—",
 * "Unavailable") that must survive to the screen intact.
 */
export function formatNumber(
  value: number | string | null | undefined,
  language: Language,
  options?: Intl.NumberFormatOptions,
): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return value
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) return value
    return numberFormatter(language, options).format(parsed)
  }
  if (!Number.isFinite(value)) return ""
  return numberFormatter(language, options).format(value)
}

/**
 * Units that sit flush against their number in every supported script: the
 * degree sign and the percent sign. Everything else ("km/h", "किमी/घंटा",
 * "কিমি/ঘন্টা") takes a space, which matters far more in Devanagari and
 * Bengali than in Latin — without it the unit reads as part of the numeral.
 */
const TIGHT_UNITS = new Set(["°", "%"])

export function isTightUnit(unit: string): boolean {
  return TIGHT_UNITS.has(unit.trim())
}

/**
 * Formats a reading together with its already-translated unit:
 * `formatMeasurement(6, "hi", "किमी/घंटा")` → `"6 किमी/घंटा"`.
 *
 * The unit string comes from the catalogue (`t("unit.kmh")`), so this never
 * decides *which* unit a language uses — only how the two halves join.
 */
export function formatMeasurement(
  value: number | string | null | undefined,
  language: Language,
  unit: string,
  options?: Intl.NumberFormatOptions,
): string {
  const formatted = formatNumber(value, language, options)
  const trimmedUnit = unit.trim()
  if (!trimmedUnit) return formatted
  if (!formatted) return trimmedUnit
  return isTightUnit(trimmedUnit)
    ? `${formatted}${trimmedUnit}`
    : `${formatted}\u00a0${trimmedUnit}`
}

// ── Timestamps ────────────────────────────────────────────────────────────────

const dateFormatters = new Map<string, Intl.DateTimeFormat>()

function dateFormatter(
  language: Language,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const locale = DATE_LOCALES[resolve(language)]
  const key = `${locale}|${JSON.stringify(options)}`
  let formatter = dateFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options)
    dateFormatters.set(key, formatter)
  }
  return formatter
}

function toDate(value: Date | string | number): Date | null {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Formats an instant in `language`. Returns null for an unparseable value so
 * callers can fall back rather than print "Invalid Date".
 *
 * The IST default matches the data: every feed this app reads is Indian.
 */
export function formatDateTime(
  value: Date | string | number,
  language: Language,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  },
): string | null {
  const date = toDate(value)
  if (!date) return null
  return dateFormatter(language, { timeZone: "Asia/Kolkata", ...options }).format(date)
}

/** Clock time only — "4:00 pm" in English, the same instant in hi/bn wording. */
export function formatClockTime(
  value: Date | string | number,
  language: Language,
  options: Intl.DateTimeFormatOptions = {},
): string | null {
  return formatDateTime(value, language, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...options,
  })
}
