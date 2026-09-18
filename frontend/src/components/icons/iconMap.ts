// Single source of truth for every icon the app renders.
//
// Nothing outside this directory imports an icon library or hand-writes an
// SVG: components ask for a name, `Icon.tsx` resolves it here. That keeps the
// set auditable (one union to read), keeps stroke/viewBox conventions from
// drifting per component, and gives the legacy-emoji aliases below a single
// place to live.
//
// Art absorbed verbatim from the three ad-hoc icon components this replaces
// (ProfileSidebar's `Icon`, FAQPage's `Icon`, App's `PersonalizedIconGraphic`)
// so the refactor is pixel-identical. `strokeWidth` is per-icon for the same
// reason: the three originals used 1.6, 2 and 1.8 respectively.

/** Every icon name the app may render. Adding art means extending this union. */
export type IconName =
  // --- interface / navigation (was ProfileSidebar's local Icon) ---
  | "close"
  | "pin"
  | "spark"
  | "logout"
  | "arrow"
  | "shield-lock"
  | "help"
  // --- interface / documents (was FAQPage's local Icon) ---
  | "copy"
  | "check"
  | "link"
  | "search"
  // --- personalized briefing (was App's PersonalizedIconGraphic) ---
  | "sun"
  | "outdoor"
  | "comfort"
  | "shield"
  | "cold"
  | "temperature"
  | "evening"
  | "air"
  | "indoor"
  | "rain"
  | "wind"

/** A circle primitive, for the few icons whose art is not a single path. */
export type IconCircle = { cx: number; cy: number; r: number }

export type IconSpec = {
  /** `d` attributes, rendered in order as sibling <path> elements. */
  paths: string[]
  /** Rendered before the paths. */
  circles?: IconCircle[]
  /** Preserves each source component's original stroke weight. */
  strokeWidth: number
}

/**
 * `PersonalizedIcon` is the subset the briefing layer assigns by name (see
 * services/personalizedBriefing.ts). It is kept as its own type so those
 * lookup tables stay exhaustively checked against the art that exists.
 */
export type PersonalizedIcon = Extract<
  IconName,
  | "sun"
  | "outdoor"
  | "comfort"
  | "shield"
  | "cold"
  | "temperature"
  | "evening"
  | "air"
  | "indoor"
  | "rain"
  | "wind"
>

export const ICON_SPECS: Record<IconName, IconSpec> = {
  // --- interface / navigation, stroke 1.6 ---
  close: { paths: ["m6 6 12 12M6 18 18 6"], strokeWidth: 1.6 },
  pin: {
    paths: [
      "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    ],
    strokeWidth: 1.6,
  },
  spark: {
    paths: ["m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"],
    strokeWidth: 1.6,
  },
  logout: { paths: ["M9 4H5v16h4m5-12 4 4-4 4m-5-4h12"], strokeWidth: 1.6 },
  arrow: { paths: ["m9 5 7 7-7 7"], strokeWidth: 1.6 },
  // Distinct from `shield`: this one carries a padlock (privacy), the other a
  // checkmark (briefing "you're covered"). They collided by name before.
  "shield-lock": {
    paths: [
      "M12 3 5 5.6v5.2c0 4.4 3 8.3 7 9.2 4-.9 7-4.8 7-9.2V5.6L12 3Zm-2.2 8.4h4.4v4h-4.4v-4Zm.8 0V9.8a1.4 1.4 0 0 1 2.8 0v1.6",
    ],
    strokeWidth: 1.6,
  },
  help: {
    paths: [
      "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.2-11.3A2.3 2.3 0 0 1 12 8.1c1.3 0 2.2.8 2.2 1.9 0 1.8-2.2 1.7-2.2 3.4M12 16.6h.01",
    ],
    strokeWidth: 1.6,
  },

  // --- interface / documents, stroke 2 ---
  copy: {
    paths: [
      "M9 9V5.5A1.5 1.5 0 0 1 10.5 4h8A1.5 1.5 0 0 1 20 5.5v8a1.5 1.5 0 0 1-1.5 1.5H15M5.5 9h8A1.5 1.5 0 0 1 15 10.5v8A1.5 1.5 0 0 1 13.5 20h-8A1.5 1.5 0 0 1 4 18.5v-8A1.5 1.5 0 0 1 5.5 9Z",
    ],
    strokeWidth: 2,
  },
  check: { paths: ["m5 13 4.5 4.5L19 7"], strokeWidth: 2 },
  link: {
    paths: [
      "M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.54 3.54 0 0 0-5-5l-1.2 1.2M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.54 3.54 0 0 0 5 5l1.2-1.2",
    ],
    strokeWidth: 2,
  },
  search: {
    paths: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-3.6-3.6"],
    strokeWidth: 2,
  },

  // --- personalized briefing, stroke 1.8 ---
  sun: {
    circles: [{ cx: 12, cy: 12, r: 3.5 }],
    paths: [
      "M12 2.5v2M12 19.5v2M4.7 4.7l1.4 1.4M17.9 17.9l1.4 1.4M2.5 12h2M19.5 12h2M4.7 19.3l1.4-1.4M17.9 6.1l1.4-1.4",
    ],
    strokeWidth: 1.8,
  },
  outdoor: {
    paths: ["M3 18h18M5 18l4-7 3 4 2-3 5 6", "M16 5h5v5M21 5l-6 6"],
    strokeWidth: 1.8,
  },
  comfort: {
    circles: [{ cx: 12, cy: 12, r: 8.5 }],
    paths: ["m8.5 12 2.2 2.2 4.8-5"],
    strokeWidth: 1.8,
  },
  shield: {
    paths: [
      "M12 3 5.5 5.7v5.2c0 4.2 2.6 7.8 6.5 10.1 3.9-2.3 6.5-5.9 6.5-10.1V5.7Z",
      "M9.2 12.2 11 14l3.9-4",
    ],
    strokeWidth: 1.8,
  },
  cold: {
    paths: [
      "M12 2.5v19M4.6 6.8l14.8 10.4M19.4 6.8 4.6 17.2M8 4.8l4 2.3 4-2.3M8 19.2l4-2.3 4 2.3",
    ],
    strokeWidth: 1.8,
  },
  temperature: {
    paths: ["M14.5 14.2V5.5a3 3 0 0 0-6 0v8.7a5 5 0 1 0 6 0Z", "M11.5 7v9"],
    strokeWidth: 1.8,
  },
  evening: {
    paths: ["M20 15.3A8.5 8.5 0 0 1 8.7 4 8.5 8.5 0 1 0 20 15.3Z"],
    strokeWidth: 1.8,
  },
  air: {
    paths: ["M3 8h10.5a2.5 2.5 0 1 0-2.3-3.5M3 12h16a2.5 2.5 0 1 1-2.3 3.5M3 16h7"],
    strokeWidth: 1.8,
  },
  indoor: {
    paths: ["m3 11 9-7 9 7", "M5.5 9.5V20h13V9.5M10 20v-6h4v6"],
    strokeWidth: 1.8,
  },
  rain: {
    paths: [
      "M6.5 15.5h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.6 9.2a3.2 3.2 0 0 0-.1 6.3Z",
      "m8 18-1 2M12.5 18l-1 2M17 18l-1 2",
    ],
    strokeWidth: 1.8,
  },
  wind: {
    paths: ["M3 8h11a2.5 2.5 0 1 0-2.3-3.5M3 12h17M3 16h11a2.5 2.5 0 1 1-2.3 3.5"],
    strokeWidth: 1.8,
  },
}

const ICON_NAMES = new Set<string>(Object.keys(ICON_SPECS))

export function isIconName(value: string): value is IconName {
  return ICON_NAMES.has(value)
}

/**
 * Emoji the app used to emit, mapped to the icon that replaced each one.
 *
 * The Android build ships a frozen frontend bundle, so a stale APK can hold an
 * old `icon` value while talking to a backend that has already moved on — and
 * the reverse, a current bundle reading a cached payload written by an older
 * backend. Resolving through this table means such a mismatch degrades to the
 * right icon instead of rendering a blank or crashing on an unknown name.
 *
 * Entries are append-only: removing one re-breaks whatever old bundle relied
 * on it. Grows as later commits retire more emoji.
 */
export const LEGACY_EMOJI_ALIASES: Readonly<Record<string, IconName>> = {
  "☀️": "sun",
  "🌞": "sun",
  "🛡️": "shield",
  "🥶": "cold",
  "🌡️": "temperature",
  "🌙": "evening",
  "💨": "wind",
  "🌬️": "wind",
  "🌧️": "rain",
  "🌦️": "rain",
  "🏡": "indoor",
  "🏠": "indoor",
  "🏃": "outdoor",
  "🙂": "comfort",
}

/**
 * Resolves a stored `icon` value to a renderable name, accepting both current
 * names and the legacy emoji above. Returns `null` for anything unrecognised
 * so callers can fall back rather than render a broken glyph.
 */
export function resolveIconName(value: string | null | undefined): IconName | null {
  if (!value) return null
  const trimmed = value.trim()
  if (isIconName(trimmed)) return trimmed
  return LEGACY_EMOJI_ALIASES[trimmed] ?? null
}
