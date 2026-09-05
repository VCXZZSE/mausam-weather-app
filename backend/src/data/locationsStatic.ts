// STATIC CURATED DATA — no geocoding or maps API. Distances and offsets
// are approximate, fixed reference values for well-known West Bengal
// locations relative to Kolkata; they are not live-queried.
export type StaticLocation = {
  name: string
  distance: string
  // Approximate typical temperature difference from Kolkata (curated
  // regional climate knowledge, e.g. Darjeeling's hill-station climate —
  // NOT an independently measured reading for that location).
  temperatureOffset: number
  // When set, this location's displayed condition uses this curated
  // approximation instead of mirroring Kolkata's live condition. Used only
  // for climatically distinct locations (Himalayan hill stations) where
  // inheriting Kolkata's exact live condition (e.g. a Kolkata thunderstorm
  // shown 600km away in Darjeeling) would be an obvious, misleading
  // coincidence. Coastal/deltaic West Bengal locations close to the same
  // monsoon system are left unset and continue to share Kolkata's live
  // condition, which is a reasonable regional approximation for them.
  conditionOverride?: { conditionCode: string; condition: string }
}

export const STATIC_LOCATIONS: StaticLocation[] = [
  { name: 'Darjeeling', distance: '600 km', temperatureOffset: -15, conditionOverride: { conditionCode: 'fog', condition: 'Foggy' } },
  { name: 'Digha Beach', distance: '180 km', temperatureOffset: -2 },
  { name: 'Sundarbans', distance: '130 km', temperatureOffset: -1 },
  { name: 'Siliguri', distance: '570 km', temperatureOffset: -6, conditionOverride: { conditionCode: 'overcast', condition: 'Overcast' } },
]
