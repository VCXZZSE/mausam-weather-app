// Per-persona homepage presets.
//
// Mausam asks one question during onboarding - "how do you experience the
// elements?" - and the answer is the strongest signal the app has about which
// readings matter. A farmer has no use for an AQI number or a metro status; a
// commuter does, and has no use for soil moisture. Rather than show every tile
// to everyone and leave the user to scroll past the irrelevant ones, the
// homepage is assembled from the preset belonging to the chosen persona.
//
// A preset is *layout only*. It never invents a reading: every id below names
// something the weather payload (services/weatherData.ts) or the government
// advisory feed already carries, and a section whose data is missing renders
// nothing. That keeps this file honest - adding a tile here cannot fabricate
// data, it can only reorder what already exists.
//
// `suppressed` is recorded explicitly rather than inferred from "everything not
// listed". Leaving a reading off someone's homepage is a product decision, and
// writing it down makes it reviewable - and testable, which is what
// test/homePresets.test.tsx checks.

import type { TranslationKey } from "@/i18n"

/** The eight profiles the onboarding crown wheel offers (App.tsx USER_PERSONAS). */
export type UserPersonaId =
  | "health"
  | "fitness"
  | "beach"
  | "travel"
  | "family"
  | "garden"
  | "commute"
  | "event"

/** One reading in the three-up strip beneath the hero temperature. */
export type HeroStatId =
  | "wind"
  | "gust"
  | "humidity"
  | "visibility"
  | "pressure"
  | "dewPoint"
  | "heatIndex"
  | "uv"
  | "rainChance"
  | "waterTemp"

/** One chip in the "today, for you" rail directly under the hero card. */
export type GlanceId =
  | "aqi"
  | "uv"
  | "rain"
  | "wind"
  | "humidity"
  | "heat"
  | "visibility"
  | "pollen"
  | "soil"
  | "sea"
  | "run"
  | "commute"
  | "comfort"
  | "sunset"
  | "alerts"

/** One card in the metric grid. */
export type MetricId =
  | "aqi"
  | "uv"
  | "run"
  | "rainfall"
  | "commute"
  | "soil"
  | "sea"
  | "pollen"
  | "comfort"
  | "sunMoon"
  | "wind"
  | "visibility"
  | "heat"
  | "event"

/** One block of the page, rendered in the order the preset lists them.
 *
 * Warnings are deliberately not among them. Every warning surface - the IMD
 * severe-weather alerts and the government bulletins alike - lives on the
 * Alerts tab, so there is exactly one place to look for one.
 */
export type SectionId =
  | "glance"
  | "metrics"
  | "hourly"
  | "sevenDay"
  | "packing"
  | "nearby"

/** The three categories the NDMA Sachet feed is split into. */
export type AdvisoryCategoryId = "general" | "farming" | "fishing"

/**
 * The two sector bulletins, as opposed to the general one.
 *
 * The backend sorts a bulletin into "fishing" or "farming" purely by its title
 * (fisher/fishing/marine, agromet/agricultur/farming/crop advisory); anything
 * else is "general". So a cyclone or rainfall warning is always general and
 * always reaches everyone - which is what makes it safe to show a sector
 * bulletin only to the persona whose sector it is.
 */
export type SpecialtyAdvisoryId = "farming" | "fishing"

export type MetricTile = {
  id: MetricId
  /** Spans both grid columns. Use for the one reading the persona opens for. */
  wide?: boolean
}

export interface HomePreset {
  persona: UserPersonaId
  /** One line under the greeting naming what this layout is tuned for. */
  focusKey: TranslationKey
  /** Exactly three; they replace wind/humidity/visibility on the hero card. */
  heroStats: readonly [HeroStatId, HeroStatId, HeroStatId]
  glance: readonly GlanceId[]
  metrics: readonly MetricTile[]
  sections: readonly SectionId[]
  /**
   * The sector bulletins to show this persona on the Alerts tab, on top of the
   * general ones everybody sees. Empty for a persona who works in neither
   * sector: an agromet advisory is noise to a commuter, and a marine one is
   * noise to anybody not going out on the water.
   */
  advisorySpecialties: readonly SpecialtyAdvisoryId[]
  /** Left off on purpose. Recorded so the omission is reviewable, not accidental. */
  suppressed: readonly MetricId[]
}

/**
 * Bumped whenever the shape of a stored record changes, so a layout saved by an
 * older build is rebuilt from the registry instead of restored.
 */
export const HOME_PRESET_VERSION = 1

export const HOME_PRESETS: Record<UserPersonaId, HomePreset> = {
  // Allergy, asthma and sensitive skin. The AQI number is the headline, and
  // pollen - fetched today but shown only on the Health tab - is promoted onto
  // the homepage. Commute and soil are noise here.
  health: {
    persona: "health",
    focusKey: "preset.health.focus",
    heroStats: ["humidity", "dewPoint", "visibility"],
    glance: ["aqi", "pollen", "uv", "humidity"],
    metrics: [
      { id: "aqi", wide: true },
      { id: "pollen" },
      { id: "uv" },
      { id: "heat" },
      { id: "comfort" },
    ],
    sections: ["glance", "metrics", "hourly", "sevenDay"],
    advisorySpecialties: [],
    suppressed: ["commute", "soil", "sea", "run", "event", "rainfall"],
  },

  // Runners and outdoor training. The best-window card leads; air quality stays
  // because it decides whether the session happens at all, and gusts matter
  // more here than the plain wind average.
  fitness: {
    persona: "fitness",
    focusKey: "preset.fitness.focus",
    heroStats: ["wind", "gust", "humidity"],
    glance: ["run", "aqi", "uv", "heat"],
    metrics: [
      { id: "run", wide: true },
      { id: "aqi" },
      { id: "uv" },
      { id: "wind" },
      { id: "sunMoon" },
      { id: "heat" },
    ],
    sections: ["glance", "metrics", "hourly", "sevenDay"],
    advisorySpecialties: [],
    suppressed: ["soil", "sea", "pollen", "commute", "event", "visibility"],
  },

  // Coast and water. Sea state leads, AQI - an inland-city reading - is
  // dropped, and this is one of only two personas that gets a sector bulletin
  // on the Alerts tab: the marine one.
  beach: {
    persona: "beach",
    focusKey: "preset.beach.focus",
    heroStats: ["wind", "gust", "waterTemp"],
    glance: ["sea", "uv", "wind", "sunset"],
    metrics: [
      { id: "sea", wide: true },
      { id: "uv" },
      { id: "wind" },
      { id: "sunMoon" },
      { id: "rainfall" },
    ],
    sections: ["glance", "metrics", "hourly", "sevenDay"],
    advisorySpecialties: ["fishing"],
    suppressed: ["aqi", "commute", "soil", "pollen", "run", "event"],
  },

  // On the move. The packing list and the other-places strip are both already in
  // the payload and belong here rather than three taps away; visibility and rain
  // are what actually change a departure.
  travel: {
    persona: "travel",
    focusKey: "preset.travel.focus",
    heroStats: ["wind", "humidity", "visibility"],
    glance: ["rain", "visibility", "alerts", "uv"],
    metrics: [
      { id: "visibility" },
      { id: "rainfall" },
      { id: "uv" },
      { id: "comfort" },
    ],
    sections: ["glance", "packing", "metrics", "nearby", "hourly", "sevenDay"],
    advisorySpecialties: [],
    suppressed: ["soil", "sea", "run", "commute", "pollen", "event"],
  },

  // School run and the daily routine. The commute card leads for the same reason
  // it does for commuters, but paired with AQI and UV rather than with road
  // visibility - the question is whether the children go out, not whether the
  // car gets through.
  family: {
    persona: "family",
    focusKey: "preset.family.focus",
    heroStats: ["humidity", "visibility", "wind"],
    glance: ["aqi", "rain", "uv", "commute"],
    metrics: [
      { id: "commute", wide: true },
      { id: "aqi" },
      { id: "uv" },
      { id: "rainfall" },
      { id: "comfort" },
    ],
    sections: ["glance", "metrics", "hourly", "sevenDay"],
    advisorySpecialties: [],
    suppressed: ["soil", "sea", "run", "event", "pollen"],
  },

  // Fields and gardens. Soil state leads; an AQI index and a metro status are
  // the two readings this persona has no use for, so both are gone. Dew point
  // stays on the hero because condensation, fungal risk and a cold-night frost
  // call are all read from it. The agromet bulletins are on the Alerts tab.
  garden: {
    persona: "garden",
    focusKey: "preset.garden.focus",
    heroStats: ["humidity", "dewPoint", "wind"],
    glance: ["soil", "rain", "humidity", "wind"],
    metrics: [
      { id: "soil", wide: true },
      { id: "rainfall" },
      { id: "sunMoon" },
      { id: "heat" },
      { id: "wind" },
    ],
    sections: ["glance", "metrics", "hourly", "sevenDay"],
    advisorySpecialties: ["farming"],
    suppressed: ["aqi", "commute", "uv", "sea", "pollen", "comfort", "event"],
  },

  // The daily journey. Visibility is the hero's first reading because fog and
  // smog are what strand this persona, and both the AQI and UV tiles stay - one
  // for the walk to the station, one for the glare on the drive.
  commute: {
    persona: "commute",
    focusKey: "preset.commute.focus",
    heroStats: ["visibility", "wind", "humidity"],
    glance: ["commute", "visibility", "aqi", "rain"],
    metrics: [
      { id: "commute", wide: true },
      { id: "visibility" },
      { id: "aqi" },
      { id: "uv" },
      { id: "rainfall" },
    ],
    sections: ["glance", "metrics", "hourly", "sevenDay"],
    advisorySpecialties: [],
    suppressed: ["soil", "sea", "pollen", "run", "event"],
  },

  // Weddings, gatherings, pandal hopping. The countdown card leads, the comfort
  // index is the number that settles a venue, and golden hour is what the
  // schedule gets built around.
  event: {
    persona: "event",
    focusKey: "preset.event.focus",
    heroStats: ["humidity", "wind", "gust"],
    glance: ["comfort", "rain", "sunset", "uv"],
    metrics: [
      { id: "event", wide: true },
      { id: "comfort" },
      { id: "rainfall" },
      { id: "sunMoon" },
      { id: "uv" },
    ],
    sections: ["glance", "metrics", "hourly", "sevenDay"],
    advisorySpecialties: [],
    suppressed: ["soil", "sea", "commute", "pollen", "run"],
  },
}

/**
 * What a profile saved before the persona question existed gets: the homepage
 * exactly as it was, so an older install is never reshuffled by an upgrade.
 */
export const DEFAULT_HOME_PRESET: HomePreset = {
  persona: "health",
  focusKey: "preset.default.focus",
  heroStats: ["wind", "humidity", "visibility"],
  glance: ["aqi", "run", "commute", "rain"],
  metrics: [
    { id: "aqi" },
    { id: "uv" },
    { id: "run" },
    { id: "rainfall" },
    { id: "commute", wide: true },
  ],
  sections: ["glance", "hourly", "metrics", "sevenDay"],
  advisorySpecialties: [],
  suppressed: [],
}

export const HOME_PRESET_STORAGE_KEY = "mausam-home-preset"

export function isUserPersonaId(value: unknown): value is UserPersonaId {
  return typeof value === "string" && value in HOME_PRESETS
}

/** The preset for a persona, or the pre-persona layout when there is none. */
export function getHomePreset(persona?: string | null): HomePreset {
  return isUserPersonaId(persona) ? HOME_PRESETS[persona] : DEFAULT_HOME_PRESET
}

type StoredPreset = {
  version: number
  persona: UserPersonaId | null
  savedAt: string
  preset: HomePreset
}

/**
 * Writes the resolved layout to storage so a cold start can lay the homepage
 * out before anything else has loaded, and so a future preset editor has
 * somewhere to persist a user's own arrangement.
 *
 * Storage is a cache, never the source of truth: a failed write is ignored and
 * a stale or malformed read falls back to the registry.
 */
export function saveHomePreset(persona?: string | null): HomePreset {
  const preset = getHomePreset(persona)
  try {
    const record: StoredPreset = {
      version: HOME_PRESET_VERSION,
      persona: isUserPersonaId(persona) ? persona : null,
      savedAt: new Date().toISOString(),
      preset,
    }
    localStorage.setItem(HOME_PRESET_STORAGE_KEY, JSON.stringify(record))
  } catch {
    /* storage unavailable - the registry still answers every read */
  }
  return preset
}

/**
 * Reads back a saved layout. Returns null rather than a guess when nothing was
 * saved, the record came from an older version, or it names a persona we no
 * longer ship - in each of those cases the caller resolves from the registry.
 *
 * The registry, not the stored copy, supplies the returned object: a preset
 * edited in source must take effect without waiting for a version bump to
 * invalidate the cache. What storage carries is *which* preset, not its guts.
 */
export function loadHomePreset(): HomePreset | null {
  try {
    const raw = localStorage.getItem(HOME_PRESET_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredPreset>
    if (parsed.version !== HOME_PRESET_VERSION) return null
    if (parsed.persona === null) return DEFAULT_HOME_PRESET
    if (!isUserPersonaId(parsed.persona)) return null
    return HOME_PRESETS[parsed.persona]
  } catch {
    return null
  }
}

export function clearHomePreset(): void {
  try {
    localStorage.removeItem(HOME_PRESET_STORAGE_KEY)
  } catch {
    /* nothing to clear */
  }
}

/**
 * The single call the homepage makes: resolve the layout for this profile and
 * keep the saved copy in step with it.
 */
export function resolveHomePreset(persona?: string | null): HomePreset {
  const preset = getHomePreset(persona)
  if (loadHomePreset() !== preset) saveHomePreset(persona)
  return preset
}
