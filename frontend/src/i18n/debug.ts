// Translation debug mode.
//
// Two different failures produce English text in a Hindi/Bengali UI:
//
//   1. A *hardcoded* string that never went through t()/td() at all. Nothing
//      records it, so it can only be found by looking at what actually
//      rendered — which is what findUntranslatedText does.
//   2. A value that went through td() but is not in the dictionary. Those are
//      recorded as they happen by reportDynamicMiss, so the overlay can name
//      the exact source string.
//
// The same scanner backs the in-app overlay and the audit test, so the two can
// never disagree about what counts as a miss.

import { getLanguage } from "./languageStore"

export const I18N_DEBUG_STORAGE_KEY = "mausam-i18n-debug"

/** Source strings that reached td() in a non-English language and came back unchanged. */
const dynamicMisses = new Set<string>()
const missListeners = new Set<() => void>()
// useSyncExternalStore compares snapshots by identity, so this must stay the
// same array until the set actually changes — rebuilding it per call would
// re-render forever.
let missSnapshot: string[] = []

function refreshMissSnapshot(): void {
  missSnapshot = [...dynamicMisses].sort()
  for (const listener of missListeners) listener()
}

export function reportDynamicMiss(value: string): void {
  if (dynamicMisses.has(value)) return
  dynamicMisses.add(value)
  refreshMissSnapshot()
}

export function getDynamicMisses(): string[] {
  return missSnapshot
}

export function subscribeDynamicMisses(listener: () => void): () => void {
  missListeners.add(listener)
  return () => {
    missListeners.delete(listener)
  }
}

export function clearDynamicMisses(): void {
  dynamicMisses.clear()
  refreshMissSnapshot()
}

/**
 * Debug mode is on when `?i18nDebug=1` is in the URL or the flag is stored.
 * A URL parameter also persists it, so it survives the in-app navigation that
 * follows (onboarding, tab switches) without being re-typed.
 */
export function isI18nDebugEnabled(): boolean {
  if (typeof window === "undefined") return false
  try {
    const parameter = new URLSearchParams(window.location.search).get("i18nDebug")
    if (parameter === "1" || parameter === "true") {
      localStorage.setItem(I18N_DEBUG_STORAGE_KEY, "1")
      return true
    }
    if (parameter === "0" || parameter === "false") {
      localStorage.removeItem(I18N_DEBUG_STORAGE_KEY)
      return false
    }
    return localStorage.getItem(I18N_DEBUG_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function setI18nDebugEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(I18N_DEBUG_STORAGE_KEY, "1")
    else localStorage.removeItem(I18N_DEBUG_STORAGE_KEY)
  } catch {
    // Debug-only; a storage failure just means the flag does not persist.
  }
}

// ── Scanner ───────────────────────────────────────────────────────────────────

/** Elements whose text is markup or data, not prose. */
const SKIPPED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "SVG",
  "PATH",
  "CIRCLE",
  "RECT",
  "ELLIPSE",
  "POLYLINE",
  "DEFS",
  "STOP",
  "NOSCRIPT",
])

/**
 * Latin runs that are correct in every language and must not be flagged:
 * acronyms and units that Indian users read untranslated, the brand wordmark,
 * and anything without a multi-letter Latin word (numbers, °C, times, symbols).
 *
 * Place names are handled separately — they are data, not UI copy, and the app
 * renders whatever the geocoder returned.
 */
const ALLOWED_TOKENS = new Set([
  "AQI",
  "UV",
  "CPCB",
  "SPF",
  "IST",
  "PM",
  "ORS",
  "GPS",
  "IMD",
  "NAQI",
  "IN",
  "N95",
  "Mausam",
  "MAUSAM",
  "mausam",
  "km",
  "kmh",
  "h",
  "L",
  "mm",
  "m",
  "AM",
  "PM2",
  "C",
  "F",
  "EN",
])

/** Strips the parts of a string that are never translated before judging it. */
function residue(text: string): string {
  return text
    // Alphanumeric identifiers are product names, not prose: N95, PM2.5, SPF30.
    .replace(/\b[A-Za-z]*\d[A-Za-z0-9.]*\b/g, " ")
    // Times, temperatures, percentages, ranges, numbers.
    .replace(/\d+(\.\d+)?\s*(°\s*[CF]?|%|km\/h|km|mm|°|L|h)?/gi, " ")
    .replace(/[–—·:/+~()[\]{}.,!?—–·|&'’"«»]/g, " ")
    // Emoji and pictographs.
    .replace(/[\p{Extended_Pictographic}️‍⃣]/gu, " ")
    .trim()
}

function looksUntranslated(text: string): boolean {
  const stripped = residue(text)
  if (!stripped) return false
  const words = stripped.split(/\s+/).filter(Boolean)
  if (!words.length) return false
  // Flag only if a Latin word survives that is not an approved token. A single
  // unknown Latin word among Devanagari/Bengali is still a miss.
  return words.some(
    (word) => /^[A-Za-z][A-Za-z-]*$/.test(word) && !ALLOWED_TOKENS.has(word),
  )
}

export type UntranslatedHit = {
  text: string
  /** The nearest element ancestor, which is what the overlay highlights. */
  element: Element
  /** True when the string is known to have passed through td() unchanged. */
  reportedByTranslator: boolean
}

/**
 * Walks `root` and returns the text that still reads as English.
 *
 * Returns nothing while English is the active language — there is nothing to
 * compare against — so callers can run it unconditionally.
 */
export function findUntranslatedText(root: ParentNode = document.body): UntranslatedHit[] {
  if (getLanguage() === "en") return []
  const owner = (root as Element).ownerDocument ?? document
  const walker = owner.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (SKIPPED_TAGS.has(parent.tagName.toUpperCase()))
        return NodeFilter.FILTER_REJECT
      if (parent.closest("[data-i18n-ignore]")) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const hits: UntranslatedHit[] = []
  const seen = new Set<string>()
  let node = walker.nextNode()
  while (node) {
    const text = node.textContent?.trim() ?? ""
    if (text && looksUntranslated(text) && !seen.has(text)) {
      seen.add(text)
      hits.push({
        text,
        element: node.parentElement!,
        reportedByTranslator: dynamicMisses.has(text),
      })
    }
    node = walker.nextNode()
  }
  return hits
}
