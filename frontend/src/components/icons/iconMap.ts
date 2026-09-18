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

// Weather and AQI artwork is imported as raw SVG strings and inlined by
// <Icon>, rather than referenced with <img src>: that needs no network and no
// extra request inside the Android WebView, and lets the AQI set inherit
// `currentColor` from the theme.
// lucide-react is imported here and nowhere else in the app: components ask
// for one of our names and never reach for the library themselves. Named
// imports keep the bundle to the glyphs actually listed in LUCIDE_ICONS.
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Ban,
  BatteryCharging,
  Car,
  Carrot,
  Check,
  ChevronDown,
  CircleCheck,
  Crosshair,
  Droplet,
  Eye,
  Fish,
  Flame,
  Flower2,
  Glasses,
  Heart,
  House,
  Lamp,
  Leaf,
  Lightbulb,
  PartyPopper,
  Plane,
  Plus,
  RotateCcw,
  RotateCw,
  Route,
  Shirt,
  Siren,
  Smile,
  SportShoe,
  SprayCan,
  Sprout,
  TrainFront,
  TrendingUp,
  TriangleAlert,
  Umbrella,
  Waves,
  Wheat,
  Zap,
  type LucideIcon,
} from "lucide-react"

import clearDay from "@/assets/icons/weather/clear-day.svg?raw"
import clearNight from "@/assets/icons/weather/clear-night.svg?raw"
import partlyCloudyDay from "@/assets/icons/weather/partly-cloudy-day.svg?raw"
import partlyCloudyNight from "@/assets/icons/weather/partly-cloudy-night.svg?raw"
import overcast from "@/assets/icons/weather/overcast.svg?raw"
import overcastNight from "@/assets/icons/weather/overcast-night.svg?raw"
import drizzle from "@/assets/icons/weather/drizzle.svg?raw"
import rainCloud from "@/assets/icons/weather/rain.svg?raw"
import thunderstormsRain from "@/assets/icons/weather/thunderstorms-rain.svg?raw"
import fogDay from "@/assets/icons/weather/fog-day.svg?raw"
import fogNight from "@/assets/icons/weather/fog-night.svg?raw"
import windGust from "@/assets/icons/weather/wind.svg?raw"
import snow from "@/assets/icons/weather/snow.svg?raw"
import thermometer from "@/assets/icons/weather/thermometer.svg?raw"

import aqiGood from "@/assets/icons/aqi/aqi-good.svg?raw"
import aqiSatisfactory from "@/assets/icons/aqi/aqi-satisfactory.svg?raw"
import aqiModerate from "@/assets/icons/aqi/aqi-moderate.svg?raw"
import aqiPoor from "@/assets/icons/aqi/aqi-poor.svg?raw"
import aqiVeryPoor from "@/assets/icons/aqi/aqi-very-poor.svg?raw"
import aqiSevere from "@/assets/icons/aqi/aqi-severe.svg?raw"

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
  // --- weather conditions (vendored Meteocons, see assets/icons/weather) ---
  | WeatherIconName
  // --- CPCB NAQI bands (hand-drawn, see assets/icons/aqi) ---
  | AqiIconName
  // --- payload icons the rules engine names (lucide-react) ---
  | LucideIconName
  // --- payload icons lucide has no equivalent for (hand-drawn) ---
  | "scarf"
  | "mask"

/**
 * Weather artwork, named after the source SVG. These are full-colour icons —
 * a sun should read as a sun — so unlike the line icons they do not inherit
 * `currentColor`.
 */
export type WeatherIconName =
  | "clear-day"
  | "clear-night"
  | "partly-cloudy-day"
  | "partly-cloudy-night"
  | "overcast"
  | "overcast-night"
  | "drizzle"
  | "rain-cloud"
  | "thunderstorms-rain"
  | "fog-day"
  | "fog-night"
  | "wind-gust"
  | "snow"
  | "thermometer"

/**
 * Icons taken from lucide-react. The name on the left is ours and is what the
 * rules engine emits; which lucide glyph draws it is an implementation detail
 * that can change without touching the wire format.
 */
export type LucideIconName =
  // focus tiles
  | "heart"
  | "trending-up"
  | "commute"
  | "home"
  // comfort band
  | "comfortable"
  | "hot"
  // packing list
  | "umbrella"
  | "boots"
  | "sunscreen"
  | "sunglasses"
  | "jacket"
  | "water-bottle"
  | "power-bank"
  // commute detail
  | "train"
  | "car"
  | "visibility"
  // seasonal / advisory subjects
  | "pollen"
  | "festival"
  | "fish"
  | "wheat"
  // personas
  | "leaf"
  | "bolt"
  | "waves"
  | "plane"
  | "sprout"
  | "party"
  // interface affordances
  | "chevron-down"
  | "external"
  // navigation and status affordances
  | "arrow-right"
  | "arrow-left"
  | "reset"
  | "retry"
  | "tick"
  | "plus"
  | "target"
  // advisory tones -- the leading mark on a piece of advice
  | "tip"
  | "warning"
  | "alert"
  | "success"
  | "blocked"
  | "hydration"
  | "harvest"

/** One per CPCB National AQI band. Drawn in currentColor. */
export type AqiIconName =
  | "aqi-good"
  | "aqi-satisfactory"
  | "aqi-moderate"
  | "aqi-poor"
  | "aqi-very-poor"
  | "aqi-severe"

/**
 * The icons drawn from inline path data in `ICON_SPECS`, as opposed to the
 * weather and AQI art loaded from SVG files. All of them inherit colour.
 */
export type LineIconName = Exclude<
  IconName,
  WeatherIconName | AqiIconName | LucideIconName
>

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

export const ICON_SPECS: Record<LineIconName, IconSpec> = {
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

  // --- packing items lucide-react has no glyph for, stroke 1.8 ---
  scarf: {
    paths: [
      "M7.5 4.2a5.5 5.5 0 0 1 9 0",
      "M6.6 6.1a7 7 0 0 1 10.8 0",
      "M8.4 8.6h7.2v3.1a3.6 3.6 0 0 1-7.2 0Z",
      "M10.1 12.3v6.1a1.7 1.7 0 0 1-3.4 0v-4.2M13.9 12.3v7.6",
    ],
    strokeWidth: 1.8,
  },
  mask: {
    paths: [
      "M4.6 9.4 3 8.6v6l1.6-.8M19.4 9.4 21 8.6v6l-1.6-.8",
      "M4.6 8.2h14.8v6.1a3.4 3.4 0 0 1-2.1 3.2l-4 1.6a3.4 3.4 0 0 1-2.6 0l-4-1.6a3.4 3.4 0 0 1-2.1-3.2Z",
      "M8 11.4h8M8.6 14.3h6.8",
    ],
    strokeWidth: 1.8,
  },
}

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
  // weather conditions
  "☀️": "clear-day",
  "🌞": "clear-day",
  "🌤️": "partly-cloudy-day",
  "⛅": "partly-cloudy-day",
  "☁️": "overcast",
  "🌙": "clear-night",
  "🌙☁️": "overcast-night",
  "🌦️": "drizzle",
  "🌧️": "rain-cloud",
  "⛈️": "thunderstorms-rain",
  "🌫️": "fog-day",
  "💨": "wind-gust",
  "🌬️": "wind-gust",
  "🌨️": "snow",
  "🌡️": "thermometer",
  // CPCB NAQI bands
  "😊": "aqi-good",
  "🙂": "aqi-satisfactory",
  "😐": "aqi-moderate",
  "😷": "aqi-poor",
  "🚫": "aqi-very-poor",
  "☠️": "aqi-severe",
  // briefing / interface
  "🛡️": "shield",
  "🥶": "cold",
  "🏡": "indoor",
  "🏠": "indoor",
  "🏃": "outdoor",
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

// --- file-backed artwork ----------------------------------------------------

export const SVG_ASSETS: Record<WeatherIconName | AqiIconName, string> = {
  "clear-day": clearDay,
  "clear-night": clearNight,
  "partly-cloudy-day": partlyCloudyDay,
  "partly-cloudy-night": partlyCloudyNight,
  overcast,
  "overcast-night": overcastNight,
  drizzle,
  "rain-cloud": rainCloud,
  "thunderstorms-rain": thunderstormsRain,
  "fog-day": fogDay,
  "fog-night": fogNight,
  "wind-gust": windGust,
  snow,
  thermometer,
  "aqi-good": aqiGood,
  "aqi-satisfactory": aqiSatisfactory,
  "aqi-moderate": aqiModerate,
  "aqi-poor": aqiPoor,
  "aqi-very-poor": aqiVeryPoor,
  "aqi-severe": aqiSevere,
}

/**
 * Which lucide glyph draws each of our names. Imported as named exports so the
 * bundler keeps only these, not the 1500-icon package.
 */
export const LUCIDE_ICONS: Record<LucideIconName, LucideIcon> = {
  heart: Heart,
  "trending-up": TrendingUp,
  commute: Route,
  home: House,
  comfortable: Smile,
  hot: Flame,
  umbrella: Umbrella,
  boots: SportShoe,
  sunscreen: SprayCan,
  sunglasses: Glasses,
  jacket: Shirt,
  "water-bottle": Droplet,
  "power-bank": BatteryCharging,
  train: TrainFront,
  car: Car,
  visibility: Eye,
  pollen: Flower2,
  festival: Lamp,
  fish: Fish,
  wheat: Wheat,
  leaf: Leaf,
  bolt: Zap,
  waves: Waves,
  plane: Plane,
  sprout: Sprout,
  party: PartyPopper,
  "chevron-down": ChevronDown,
  external: ArrowUpRight,
  tip: Lightbulb,
  warning: TriangleAlert,
  alert: Siren,
  success: CircleCheck,
  blocked: Ban,
  // Same glyph as water-bottle by coincidence, not by accident: one names a
  // packing item, the other the tone of a piece of hydration advice.
  hydration: Droplet,
  harvest: Carrot,
  "arrow-right": ArrowRight,
  "arrow-left": ArrowLeft,
  reset: RotateCcw,
  retry: RotateCw,
  tick: Check,
  plus: Plus,
  target: Crosshair,
}

export function isLucideIcon(name: IconName): name is LucideIconName {
  return name in LUCIDE_ICONS
}

export function isSvgAssetIcon(
  name: IconName,
): name is WeatherIconName | AqiIconName {
  return name in SVG_ASSETS
}

/** Both registries together: every name `isIconName` should accept. */
const ICON_NAMES = new Set<string>([
  ...Object.keys(ICON_SPECS),
  ...Object.keys(SVG_ASSETS),
  ...Object.keys(LUCIDE_ICONS),
])

// --- semantic resolvers -----------------------------------------------------

/**
 * Weather icon for a `conditionCode`, which is what the rules engine emits
 * (see backend/src/normalizers/conditionCode.ts, where WMO codes are mapped).
 * Deliberately keyed on the code and not on whatever emoji used to sit there.
 *
 * `isDay === false` picks the night artwork for the conditions that read
 * differently after dark; rain and storms look the same at any hour. When
 * `isDay` is omitted the daytime icon is used, matching the previous behaviour
 * for demo data and pre-v0.2 backend responses.
 */
const CONDITION_ICONS: Record<string, WeatherIconName> = {
  sunny: "clear-day",
  clear: "clear-day",
  fair: "clear-day",
  partly_cloudy: "partly-cloudy-day",
  cloudy: "overcast",
  overcast: "overcast",
  drizzle: "drizzle",
  showers: "drizzle",
  rain: "rain-cloud",
  // Meteocons 2.0 has no heavier rain variant, so heavy rain shares the rain
  // artwork — as it did before, when both were the same emoji.
  heavy_rain: "rain-cloud",
  thunderstorm: "thunderstorms-rain",
  storm: "thunderstorms-rain",
  fog: "fog-day",
  mist: "fog-day",
  wind: "wind-gust",
  snow: "snow",
}

const NIGHT_CONDITION_ICONS: Record<string, WeatherIconName> = {
  sunny: "clear-night",
  clear: "clear-night",
  fair: "clear-night",
  partly_cloudy: "partly-cloudy-night",
  cloudy: "overcast-night",
  overcast: "overcast-night",
  fog: "fog-night",
  mist: "fog-night",
}

/** Shown when a condition code is unrecognised. */
export const FALLBACK_WEATHER_ICON: WeatherIconName = "thermometer"

export function weatherIconForCondition(
  conditionCode: string,
  isDay?: boolean,
): WeatherIconName {
  const key = conditionCode.trim().toLowerCase().replace(/[\s-]+/g, "_")
  if (isDay === false && NIGHT_CONDITION_ICONS[key])
    return NIGHT_CONDITION_ICONS[key]
  return CONDITION_ICONS[key] ?? FALLBACK_WEATHER_ICON
}

/**
 * CPCB National AQI bands, in the order the standard defines them. The upper
 * bounds mirror backend/src/normalizers/cpcbAqi.ts; `token` names the CSS
 * custom property that colours both this icon and the AQI meter, so the two
 * cannot drift apart.
 */
export const AQI_BANDS = [
  { max: 50, label: "Good", icon: "aqi-good", token: "--aqi-good" },
  { max: 100, label: "Satisfactory", icon: "aqi-satisfactory", token: "--aqi-satisfactory" },
  { max: 200, label: "Moderate", icon: "aqi-moderate", token: "--aqi-moderate" },
  { max: 300, label: "Poor", icon: "aqi-poor", token: "--aqi-poor" },
  { max: 400, label: "Very Poor", icon: "aqi-very-poor", token: "--aqi-very-poor" },
  { max: Infinity, label: "Severe", icon: "aqi-severe", token: "--aqi-severe" },
] as const satisfies ReadonlyArray<{
  max: number
  label: string
  icon: AqiIconName
  token: string
}>

export type AqiBand = (typeof AQI_BANDS)[number]

/** The band an index falls in. Values above 400 are Severe. */
export function aqiBandForIndex(index: number): AqiBand {
  return AQI_BANDS.find((band) => index <= band.max) ?? AQI_BANDS[AQI_BANDS.length - 1]
}

/** Resolves the band by its English label, for payloads that carry only that. */
export function aqiBandForLabel(label: string): AqiBand | null {
  const needle = label.trim().toLowerCase()
  return AQI_BANDS.find((band) => band.label.toLowerCase() === needle) ?? null
}
